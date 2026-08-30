# Arquitetura — Importação/Exportação de Dados

Três domínios completos, ponta a ponta (importação + exportação + frontend): **Financeiro**
(`financial_periods`, 2026-08-29), **Funil** (`funnel_snapshots`, 2026-08-29) e **Produtos**
(`products`, 2026-08-29 — o mais diferente dos três: sem `period`, com campo de texto/booleano e sem
constraint de unicidade no banco, e mesmo assim coube na mesma estrutura). Marketing/Campanhas fica
para uma PR seguinte. O ponto de extensão é
[domains.py](../../apps/api/app/modules/imports/domains.py) (compartilhado pelos dois lados) +
[writers.py](../../apps/api/app/modules/imports/writers.py) (importação) +
[readers.py](../../apps/api/app/modules/exports/readers.py) (exportação) — nenhum outro módulo do
pipeline (parsers, mapping, validation, security, serializers, os dois routers) conhece um domínio
específico.

## Por que processamento síncrono (sem fila de jobs)

Não existe infraestrutura de fila (Celery/RQ) nem serviço de worker na aplicação — confirmado por
auditoria de código antes de desenhar este módulo (nenhum uso de `BackgroundTasks`/Celery em todo o
repositório). A aplicação roda em **réplica única no Railway** (mesma constatação já documentada em
`docs/auditoria/AUDITORIA_METRICAS_GLOSSARIO_SESSAO.md`), então mesmo uma fila in-process (thread/
`asyncio.create_task`) teria o mesmo problema de state: nada sobrevive a um restart/deploy.

Decisão: cada etapa do wizard (upload, mapeamento, confirmação) processa e responde dentro do mesmo
request HTTP. Para isso não estourar o tempo de request nem a memória do processo, dois tetos
conservadores em [security.py](../../apps/api/app/modules/imports/security.py):

- `MAX_FILE_SIZE_BYTES = 5 MB`
- `MAX_ROWS = 2000`

Consequência direta no modelo de estado: `ImportJobStatus` não tem `QUEUED`/`PROCESSING` — só
`UPLOADED → MAPPING_REQUIRED → READY → (COMPLETED | COMPLETED_WITH_ERRORS) | CANCELLED | FAILED`.
Reavaliar estes tetos (e a decisão síncrona) se o volume real de uso crescer a ponto de esbarrar neles;
não há hoje evidência de que isso aconteça.

## Por que sem storage de arquivo (S3/volume)

Não existe S3 nem volume persistente na infraestrutura atual (mesma auditoria acima). Guardar o
arquivo cru exigiria inventar essa infraestrutura só para este módulo. Em vez disso, o arquivo é
parseado **uma única vez**, no upload, e as linhas já parseadas ficam em `import_jobs.raw_rows`
(`JSONB`) — nunca o arquivo em si. Isso tem uma vantagem real: o wizard (upload → mapeamento →
preview → confirmação, requests HTTP separados, potencialmente em processos diferentes atrás do load
balancer) fica **stateless** sem precisar de sessão em memória nem de reler um arquivo em disco.

Efeito colateral aceito: reprocessar o mesmo arquivo físico exige um novo upload (não há como "retomar"
um job por referência ao arquivo original) — irrelevante no fluxo real, já que o wizard sempre confirma
ou cancela um job antes de precisar de outro.

## Arquitetura por adaptadores (ponto de extensão para novos domínios)

```
upload (multipart) → parsers.py (CSV/XLSX/JSON → ParsedFile genérico)
                    → mapping.py (sugestão automática de campo, difflib + alias + histórico)
                    → [usuário confirma mapeamento via PUT /mapping]
                    → validation.py (obrigatório, tipo, duplicidade — recalculado sempre)
                    → [usuário revisa preview via GET /preview]
                    → writers.py[domain] (grava no domínio real, reaproveitando o repository dele)
```

Todo o pipeline até `validation.py` é **genérico** — não conhece `financial_periods`/`funnel_snapshots`
especificamente, só a `DomainSpec` do domínio (`app/modules/imports/domains.py`). Adicionar um domínio
novo (ex.: Produtos) não toca em nenhum desses módulos, e o Funil (2026-08-29) é a prova disso — passo
a passo real, não hipotético:

1. Registrar uma `DomainSpec` nova em `domains.py` (lista de `FieldSpec` com aliases reais + chave
   natural). Precisou de um `DataType` novo (`"integer"`, além de `"date"`/`"decimal"`) e de
   `parse_integer` em `transform.py` — reaproveita `parse_decimal` para herdar de graça a mesma
   resolução de separador de milhar/decimal ambíguo, só rejeitando se sobrar uma fração de verdade.
2. Escrever uma função de escrita em `writers.py` (`write_funnel_snapshot_row`) e uma de leitura em
   `exports/readers.py` (`read_funnel_snapshot_rows`), cada uma reaproveitando o `repository` do módulo
   de domínio já existente (nunca duplicar lógica de upsert/listagem — `funnels_repository` já tinha
   tudo, mesmo formato de `financials_repository`).
3. Registrar as duas funções em `DOMAIN_WRITERS`/`DOMAIN_READERS`, e a busca de chave natural existente
   (duplicidade) em `service.py::_NATURAL_KEY_LOOKUPS` (mesmo padrão dict-por-domínio, não um
   if/elif crescendo a cada domínio).
4. Frontend: acrescentar `{ key, label }` em `apps/web/src/lib/data-domains.ts` — a única lista que o
   frontend mantém (pequena demais para valer buscar de `GET /imports/domains`, que além disso exige
   `ANALYST`+ e o painel de exportação é visível para `VIEWER` também).

Nenhuma migration foi necessária para o Funil nem para Produtos — `funnel_snapshots` (RF-020) e
`products` já existiam antes deste módulo. "Leads"/"Clientes", citados no prompt original como
domínios de exemplo, continuam **não existindo** como tabela própria — `funnel_snapshots.leads` já
cobre o caso real de "Leads"; "Clientes" sem uma tabela própria seria só o contador
`funnel_snapshots.customers`/`campaigns.customers`, não um cadastro de clientes de verdade. Não foram
criados artificialmente para caber neste módulo.

**Produtos foi mais longe que o passo a passo acima** — a única extensão real que o pipeline genérico
precisou até agora, não só um registro novo de dados:

- Dois `DataType` novos: `"string"` (`parse_string`, com `FieldSpec.max_length` opcional — espelha o
  limite da coluna no banco, ex.: `String(255)`, rejeitado com erro explícito em vez de deixar o
  `INSERT` falhar com um erro genérico) e `"boolean"` (`parse_boolean`, aceita valores comuns em
  português/inglês — `"sim"/"não"`, `"ativo"/"inativo"`, `"true"/"false"`, `1`/`0` — e rejeita qualquer
  outra coisa em vez de adivinhar um "truthy").
- **Chave natural sem constraint de unicidade no banco**: `products.name` não é `UNIQUE` (ao contrário
  de `period` em Financeiro/Funil, que já é a própria chave única da tabela). A deduplicação de
  verdade é só na camada de importação —
  `domains.py::normalize_natural_key_value` (minúsculo + sem espaço nas bordas) usado nos dois lados da
  comparação (`validation.py` para as linhas do arquivo, `imports/repository.py::get_existing_product_names`
  para o que já existe no banco) — e uma busca por nome equivalente no repository do domínio real
  (`products/repository.py::get_product_by_name`, mesma normalização).
- **Campo `NOT NULL` com valor padrão** (`products.active`, default `True`): diferente de
  `revenue`/`costs` etc. (nullable de verdade, onde "não mapeado" sempre quer dizer `None`),
  `writers.py::write_product_row` nunca passa `active=None` explícito — omite a chave do dicionário de
  campos quando não mapeado/em branco, deixando o banco aplicar o default na criação e preservando o
  valor existente numa atualização (passar `None` explícito violaria a constraint `NOT NULL`).
- **Domínio sem conceito de período**: `DomainSpec.supports_date_range = False` — Produtos é um
  catálogo, não uma série temporal. O filtro de data do export é ignorado no backend
  (`exports/service.py`, para não filtrar por acidente nem gerar um nome de arquivo que sugira um
  filtro que não foi aplicado) e escondido no frontend (`lib/data-domains.ts::supportsDateRange`).

## Sugestão de mapeamento (não é autorização)

`mapping.py::suggest_mapping` roda em três camadas, na ordem:

1. **Mapeamento lembrado** — o mapeamento confirmado no último import bem-sucedido (`COMPLETED` ou
   `COMPLETED_WITH_ERRORS`) da mesma organização, para o mesmo domínio (`service.py::_get_remembered_mapping`,
   varre os últimos 20 jobs). Casa em confiança "alta" direto, sem depender de fuzzy match de novo.
2. **Alias exato** — cada `FieldSpec` tem uma lista de aliases reais (`"faturamento"`, `"receita"`,
   `"vendas"` → `revenue`), normalizados (sem acento, minúsculo, pontuação colapsada).
3. **Fuzzy match** — `difflib.SequenceMatcher` (stdlib) contra nome canônico + aliases. Sem dependência
   nova, sem IA/LLM — restrição explícita do prompt original (seção 39) para algo que uma regra
   determinística já resolve.

Limiares de confiança: `alta ≥ 0.92`, `media ≥ 0.75`, `baixa ≥ 0.55`, abaixo disso `sem_correspondencia`.

Importante: a sugestão nunca é persistida como se fosse decisão do usuário. Só vira
`ImportJob.mapping` quando o usuário confirma explicitamente via `PUT /imports/{id}/mapping` — o mesmo
vale para um template salvo (`ImportMappingTemplate`), que também é só uma sugestão pré-preenchida.

## Validação (por que é sempre recalculada, nunca cacheada)

`GET /preview` e `POST /confirm` chamam `validation.py::validate_rows` a partir de
`job.raw_rows + job.mapping + job.transform_config` **toda vez**, nunca a partir de um resultado
salvo. Isso garante que o preview sempre reflete o mapeamento atual — se o usuário corrige um mapeamento
errado, não existe risco de o preview mostrar um resultado desatualizado de uma tentativa anterior. O
custo (reprocessar até 2000 linhas em memória a cada chamada) é aceitável dado o teto de linhas já
imposto por outro motivo (processamento síncrono).

Duplicidade é detectada por **chave natural do domínio** (`DomainSpec.natural_key`), tanto contra o
próprio arquivo (duas linhas iguais no mesmo upload) quanto contra o banco — um componente de texto da
chave é comparado sem diferenciar maiúsculas/minúsculas nem espaço nas bordas
(`normalize_natural_key_value`), necessário para Produtos (ver acima). Estratégia de tratamento de
duplicata é escolhida pelo usuário na confirmação: `"skip"` (padrão) ou `"update"`. `"create_new"` do
vocabulário genérico do prompt original não se aplica a nenhum dos três domínios de hoje —
`(organization_id, period)` já é a própria constraint de unicidade do banco em Financeiro/Funil, e
Produtos, mesmo sem constraint de banco, resolveu deduplicar por nome em vez de permitir duplicata (a
alternativa seria mais fiel ao "não tem unicidade real", mas corresponderia pior à intenção de quem
importa uma planilha de produtos). Um domínio futuro que realmente precise de "criar sempre, nunca
atualizar" poderia reintroduzir essa opção.

## Formato de data e número

Nunca adivinhados em silêncio quando ambíguos. Ver [IMPORT_FORMATS.md](IMPORT_FORMATS.md) para os
formatos aceitos e como a ambiguidade `DD/MM` vs `MM/DD` é resolvida (`transform_config.date_format`,
escolhido pelo usuário, padrão `DMY`).

## Permissões

Sem permissão nomeada nova (`data.import` etc.) — importação exige `require_role(MembershipRole.ANALYST)`
(escrita), reaproveitando a hierarquia de papéis já existente
(`ORGANIZATION_OWNER > ORGANIZATION_ADMIN > ANALYST > VIEWER`). Mesmo precedente já usado para RN-010
(Analytics/Relatório exigem ANALYST+; VIEWER só lê Dashboard). `VIEWER` não pode iniciar nem confirmar
uma importação — testado em `tests/security/test_import_security.py::test_viewer_cannot_upload_import`.

**Exportação** já é leitura, não escrita: usa `get_organization_context` (sem papel mínimo), o mesmo
nível de `GET /financials` — RN-010 nunca distinguiu "ver na tela" de "baixar o mesmo dado em arquivo".
`VIEWER` pode exportar — testado em `tests/api/test_exports.py::test_viewer_can_export_same_as_dashboard_read`.

## Auditoria

Toda mudança de estado relevante do job de importação grava em `audit_logs` via `record_audit`
(convenção já estabelecida no resto da aplicação): `import.created`, `import.mapping_changed`,
`import.confirmed`, `import.completed` / `import.completed_with_errors`. Toda exportação também grava
`export.{domain}.downloaded` — é egresso de dado, vale auditar mesmo sendo só leitura.

## Exportação (leitura → serialização, o espelho da importação)

`app/modules/exports/` segue a mesma divisão de responsabilidades do lado da importação, na direção
contrária:

```
GET /exports/{domain}?format=&date_from=&date_to=
    → readers.py[domain]  (le do repository do domínio real, devolve linhas no formato canônico)
    → serializers.py      (CSV com cabeçalho amigável + BOM, XLSX com tipo nativo, ou JSON com chave
                            canônica — genérico, não conhece o domínio, só a DomainSpec)
    → Response (bytes + Content-Type + Content-Disposition attachment)
```

Decisões específicas:

- **JSON usa a chave canônica** (`period`, `revenue`...), não o nome de exibição — um arquivo exportado
  assim é reimportável diretamente, sem precisar passar pela etapa de mapeamento de novo.
- **CSV/XLSX usam o nome de exibição** (`Período`, `Receita`...) para quem abre o arquivo direto numa
  planilha — e por coincidência não-acidental (os nomes de exibição já são um alias reconhecido de cada
  campo em `domains.py`), reimportar esse mesmo arquivo ainda sugere mapeamento em confiança "alta".
- **CSV sai com BOM UTF-8** (`utf-8-sig`) — Excel no Windows não reconhece UTF-8 sem BOM e corrompe
  acento; mesma preocupação que `parsers.py::_decode_text` já trata na leitura.
- **XLSX guarda o tipo nativo** (data como `date`, número como `float`), não string — célula
  formatada/ordenável/filtrável no Excel, ao contrário do CSV (só texto).
- Reaproveita `sanitize_for_spreadsheet` (já existia, escrito durante a importação especificamente para
  ser usado aqui) contra CSV/Spreadsheet Formula Injection em qualquer campo de texto livre — nenhum
  campo de `financial_periods` é texto hoje, mas o serializer é genérico para os próximos domínios.
- Mesmo teto `MAX_ROWS` (2000) da importação, pela mesma razão estrutural (processamento síncrono, sem
  fila de jobs) — acima disso, a resposta é 400 pedindo para filtrar por um intervalo de datas menor.
- CORS precisa expor `Content-Disposition` explicitamente (`app/main.py::CORSMiddleware(expose_headers=...)`)
  — sem isso, `fetch` em requisição cross-origin (dev local: frontend em `:3000` chamando a API em
  `:8000` direto, sem o rewrite same-origin que existe em produção) não consegue ler o header, e o
  cliente (`downloadFile`, `apps/web/src/lib/api.ts`) cai sempre no nome de arquivo genérico `"export"`
  em vez do nome de verdade. Bug real, encontrado e corrigido durante a verificação ao vivo do frontend
  (2026-08-29), não uma suposição.

## Frontend — Central de Dados

Página `organizations/[id]/central-de-dados`, nova entrada de sidebar sem `minRole` (exportar é
leitura, ver acima). Composição:

- `ExportPanel` (`components/export-panel.tsx`) — sempre visível, inclusive para `VIEWER`: seletor de
  domínio (`lib/data-domains.ts`), formato (CSV/XLSX/JSON), filtro de período opcional (padrão: todos
  os períodos — escondido para um domínio sem `supportsDateRange`, ex.: Produtos), botão de download
  (via `downloadFile` + `<a download>` programático).
- `ImportWizard` (`components/import-wizard.tsx`) — só para quem pode escrever (`canPerformActions`,
  `lib/roles.ts`): seletor de domínio, upload → mapeamento (com sugestão pré-preenchida e badge de
  confiança) → preview → confirmação, espelhando os endpoints do backend passo a passo. O seletor de
  formato de data só aparece na etapa de mapeamento se o domínio tiver algum campo `"date"` (Produtos
  não tem). `VIEWER` vê só um aviso explicando por quê, nunca um formulário que terminaria em 403.
- Histórico de importações (paginado, "Carregar mais") e lista de erros por linha sob demanda — só
  para quem pode escrever, mesmo motivo (o backend também exige `ANALYST`+ nesses endpoints).

Atalho na Início (2026-08-30): `quickAccessItems` (`organizations/[id]/page.tsx`) ganhou "Central de
Dados", sem `minRole` (mesmo critério da entrada de sidebar). É o único item da lista que não é um
módulo de visualização — a entrada de sidebar sozinha não bastava para dar destaque a uma ferramenta
de importação/exportação em massa na tela que todo mundo vê primeiro.

## O que este documento não decide ainda

- Marketing/Campanhas — precisa antes decidir como resolver o canal (`channel_id`) a partir do nome
  escrito no arquivo (ver domains.py, docstring do módulo).
- Seleção de aba/planilha em arquivo `.xlsx` com múltiplas abas — hoje só a primeira aba não vazia é
  lida (ver [IMPORT_FORMATS.md](IMPORT_FORMATS.md)).
- Scanner de malware real no upload — não existe serviço compatível disponível hoje; a validação atual
  (extensão + assinatura de conteúdo real, ex.: bytes ZIP de um `.xlsx`) cobre o caso mais comum de
  arquivo renomeado, não substitui um scanner.
