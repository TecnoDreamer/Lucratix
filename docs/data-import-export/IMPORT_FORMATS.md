# Formatos de Importação

## Arquivo

| Formato | Extensão | Detecção de conteúdo real |
|---|---|---|
| CSV | `.csv` | delimitador detectado automaticamente (`,`, `;` ou tab) via `csv.Sniffer`, com fallback para vírgula |
| XLSX | `.xlsx` | assinatura ZIP (`PK\x03\x04`) conferida nos bytes, não só na extensão |
| JSON | `.json` | precisa ser JSON válido, parseável |

Limites (processamento síncrono — ver [ARCHITECTURE.md](ARCHITECTURE.md)):

- Tamanho máximo: **5 MB**.
- Linhas máximas: **2000**.
- Encoding de texto (CSV/JSON): tenta `utf-8-sig` → `utf-8` → `latin-1`, nessa ordem.

### CSV

Primeira linha é sempre o cabeçalho. Valores são strings; espaços nas bordas são removidos
automaticamente. Suporta exportações brasileiras comuns com `;` como separador.

### XLSX

Só a **primeira aba não vazia** é lida — seleção de aba fica para uma versão futura. Primeira linha da
aba é o cabeçalho. Linhas totalmente em branco no meio da planilha são ignoradas (não contam como
linha de dado nem geram erro). Células já vêm tipadas pelo `openpyxl` (`int`/`float`/`date`/`datetime`),
o motor de transformação aceita ambos os casos (célula tipada ou string crua vinda de CSV/JSON).

### JSON

Aceita uma lista de objetos (`[{...}, {...}]`) ou um envelope `{"data": [...]}`. Cada item precisa ser
um objeto plano — chave aninhada em objeto/lista é rejeitada explicitamente (mensagem de erro cita o
campo). Os cabeçalhos são a união de todas as chaves vistas, na ordem em que aparecem primeiro.

## Domínios suportados

**Financeiro** (`financial_periods`), **Funil** (`funnel_snapshots`) e **Produtos** (`products`). Ver
`GET /api/v1/organizations/{id}/imports/domains` para a lista de campos de cada domínio e quais são
obrigatórios:

- Financeiro/Funil: só `period` (data) é obrigatório; demais campos opcionais (Financeiro: `revenue`,
  `costs`, `expenses`, `marketing_investment`, `taxes`; Funil: `impressions`, `visits`, `leads`, `mqls`,
  `sqls`, `opportunities`, `customers`, `repeat_purchases`).
- Produtos: só `name` é obrigatório; `category`, `price`, `cost`, `active` são opcionais. Sem `period`
  — não tem filtro de data no export (ver ARCHITECTURE.md).

## Data e número

- **Data**: formato `AAAA-MM-DD` (ISO) é sempre aceito, em qualquer configuração — nunca é ambíguo. Para
  `DD/MM/AAAA` vs `MM/DD/AAAA`, a direção é escolhida explicitamente pelo usuário no wizard
  (`transform_config.date_format`: `"DMY"` (padrão) ou `"MDY"`) — o sistema nunca adivinha em silêncio um
  formato ambíguo.
- **Número/moeda**: aceita separador de milhar e decimal em qualquer ordem comum
  (`"1.250,50"`, `"1,250.50"`, `"1250.50"`), com ou sem símbolo de moeda (`"R$ 1.250,50"`). O separador
  decimal é identificado pela posição (o que aparece por último na string) ou, com só vírgula, pelo
  número de dígitos depois dela (1–2 dígitos = decimal; mais que isso = separador de milhar). Qualquer
  caractere fora do padrão numérico esperado (ex.: letra) é rejeitado com erro explícito — nunca
  descartado em silêncio.
- **Inteiro** (contadores do Funil — impressões, leads...): mesma resolução de separador ambíguo do
  número acima; rejeitado com erro explícito se sobrar uma fração de verdade (ex.: `"10.5"` não é uma
  contagem válida).
- **Texto** (ex.: nome/categoria de Produtos): espaço nas bordas é removido; vazio depois de removido
  vira "não preenchido", igual aos outros tipos. Respeita o limite de tamanho da coluna no banco (ex.:
  255 caracteres), rejeitado com erro explícito se ultrapassar.
- **Booleano** (ex.: `active` de Produtos): aceita `"sim"/"não"`, `"ativo"/"inativo"`,
  `"true"/"false"`, `"yes"/"no"`, `1`/`0` (maiúscula/minúscula tanto faz) — qualquer outro valor é
  rejeitado com erro explícito, nunca um "truthy" adivinhado.

## Duplicidade

Uma linha é duplicata quando sua chave natural já existe — no próprio arquivo (linha repetida) ou no
banco (registro já importado antes). Em Financeiro/Funil a chave é `period`; em Produtos é `name`,
comparado sem diferenciar maiúsculas/minúsculas nem espaço nas bordas (`products.name` não tem
constraint de unicidade no banco — essa comparação é a única defesa real contra duplicata). A primeira
ocorrência no arquivo fica `valid`; as seguintes com a mesma chave ficam `duplicate`. Estratégia de
tratamento (escolhida na confirmação): `"skip"` (padrão, não altera o registro existente) ou
`"update"` (sobrescreve — em Produtos, um campo não mapeado/em branco nunca apaga o valor já
existente, mesmo em uma atualização).
