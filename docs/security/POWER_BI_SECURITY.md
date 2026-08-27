# Power BI — modelo de segurança (para quando a integração for aprovada)

> Companion de `docs/analytics/POWER_BI.md`. Nenhuma integração real existe hoje (ver escopo confirmado com o usuário, `docs/auditoria/AUDITORIA_BI_RELATORIOS.md`) — este documento existe para que a primeira implementação **não comece do zero em termos de segurança**, e para servir de checklist antes de habilitar qualquer uma das duas opções em produção.

## Por que isto precisa de um documento próprio

O risco mais crítico já identificado no threat model do produto (`docs/security/threat-model.md`) é **elevação de privilégio horizontal entre organizações** (um usuário/processo vendo dado de uma organização que não é a sua). Toda a arquitetura atual mitiga isso centralizando o filtro de `organization_id` na camada de acesso a dado, derivado sempre da sessão do usuário autenticado (`get_organization_context`, `app/core/deps.py`), nunca de um valor recebido do cliente sem checagem.

**Qualquer integração com Power BI introduz um segundo mecanismo de autenticação/autorização** (API key para a Opção A, Service Principal para a Opção B) que não passa pelo fluxo de sessão existente — se esse segundo mecanismo não reimplementar o mesmo isolamento com o mesmo rigor, ele se torna um jeito de contornar a mitigação principal do produto.

## Opção A — API key para Power Query REST

| Ameaça (STRIDE) | Risco concreto | Mitigação exigida |
|---|---|---|
| Spoofing | Chave vazada (commitada por engano, exposta em log, capturada em trânsito) usada por terceiro | Chave nunca em texto claro no banco (hash, mesmo padrão de `password_reset_token.py`); só transmitida uma vez, na criação; HTTPS obrigatório |
| Tampering | Requisição forjada tentando pedir dado de outra organização | Chave carrega `organization_id` fixo no momento da criação — nunca aceitar `organization_id` como parâmetro livre da requisição sendo apenas validado contra a chave depois; o dependency de auth da chave devolve o mesmo formato de `OrganizationContext` já usado por `get_organization_context`, para reusar as mesmas rotas sem duplicar lógica de filtro |
| Information Disclosure | Chave com escopo amplo demais usada para ler dado além de analytics | Escopo explícito e mínimo (`analytics:read`, nunca escrita) — uma chave para Power BI nunca deveria conseguir criar/editar/deletar nada |
| Elevation of Privilege | Chave de um papel (`VIEWER`) usada para acessar dado que exigiria `ANALYST`+ | Chave herda o papel de quem a criou no momento da criação, checado do mesmo jeito que `require_role` já checa hoje — não um papel próprio e paralelo |
| Repudiation | Uso da chave sem rastro de auditoria | Toda leitura via API key registrada com identificador da chave (não a chave em si) — reaproveitar o padrão de auditoria já existente (RN-015) |
| Denial of Service | Uso abusivo de uma chave (scraping, polling agressivo) | Rate limiting por chave, mesmo mecanismo já usado em login (`app/core/rate_limit.py`), adaptado |

**LGPD (ver `docs/security/lgpd.md`):** na Opção A, o dado sai do controle direto do Lucratix e passa a residir no tenant Power BI do cliente (Power BI Desktop local, ou Power BI Service dele). Isso não é uma falha de segurança do Lucratix, mas precisa estar em contrato/termos com o cliente: quem exporta dado da própria organização passa a ser responsável pela retenção/proteção dele fora da plataforma. **Nenhuma feature técnica corrige isso** — é uma responsabilidade a documentar explicitamente para o cliente antes de habilitar a Opção A, não algo para "resolver" com código.

## Opção B — Embedding "app owns data"

Risco estrutural diferente e maior: o **Service Principal tem acesso a todo o workspace Power BI**, que hospedaria dados de **todas** as organizações-cliente ao mesmo tempo (um único workspace compartilhado é o modelo padrão de "app owns data" — criar um workspace por organização não escala e não é o padrão suportado pela Microsoft para este cenário).

| Ameaça (STRIDE) | Risco concreto | Mitigação exigida |
|---|---|---|
| Information Disclosure | Usuário da organização A vê dado da organização B dentro do relatório embutido | **Row-Level Security (RLS) obrigatório e testado** no dataset Power BI, mapeando `organization_id` do usuário logado para o filtro de linha do dataset — não é uma opção de configuração "se der tempo", é pré-requisito de lançamento. O backend deve gerar o embed token já passando a identidade RLS correta (`GenerateTokenRequest.identities`), nunca um token genérico de workspace |
| Spoofing | Client secret do Service Principal vazado permite qualquer chamada em nome da aplicação | Secret nunca em código-fonte/repositório (variável de ambiente/secret manager); certificado preferível a secret de texto quando o provedor de hospedagem suportar; rotação periódica documentada e testada antes do primeiro uso em produção |
| Elevation of Privilege | Token de embed gerado sem escopo, reutilizável para outro relatório/dataset além do previsto | Token de embed com escopo mínimo (`Report.Read.All` mais estrito possível, nunca `Dataset.ReadWrite.All`), tempo de vida curto, gerado sob demanda por requisição — nunca cacheado/reusado entre organizações diferentes |
| Denial of Service | Custo de capacidade Premium consumido por uso indevido/scraping do embed | Rate limiting na rota que gera o embed token, do mesmo jeito que outras rotas sensíveis já são limitadas |
| Repudiation | Sem rastro de quem viu qual relatório embutido, quando | Auditoria (RN-015) do evento "embed token gerado para organização X por usuário Y" |

## Checklist antes de habilitar qualquer integração em produção

1. Nova revisão do threat model (`docs/security/threat-model.md`) incluindo o novo fluxo, não só este documento isolado.
2. Teste de integração dedicado provando isolamento entre organizações através do novo mecanismo (mesmo espírito do teste já exigido para toda rota de dado de organização, ver Definition of Done do projeto) — para a Opção B, isso significa um teste automatizado de RLS, não só revisão manual.
3. Secrets (API keys, client secret/certificado do Service Principal) fora do controle de versão, com plano de rotação documentado.
4. Confirmação com o usuário responsável pelo produto sobre a responsabilidade contratual de dado exportado (Opção A) antes de liberar para clientes.

## O que não existe hoje (para não presumir o contrário)

Nenhuma chave de API, nenhum Service Principal, nenhum Azure AD App Registration, nenhum workspace Power BI, nenhuma configuração de RLS. Este documento descreve o que **precisaria** existir, não o estado atual.
