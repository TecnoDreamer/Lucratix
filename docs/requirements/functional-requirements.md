# Requisitos Funcionais

Convenção: cada requisito tem ID único `RF-XXX`, prioridade (`P0` crítico ao MVP, `P1` importante, `P2` desejável), e é rastreado em [traceability-matrix.md](traceability-matrix.md). Critérios de aceite em Given/When/Then estão em [acceptance-criteria.md](acceptance-criteria.md).

---

## Autenticação e Usuário

### RF-001 — Cadastro de usuário
- **Ator:** Visitante (futuro usuário) ou `PLATFORM_ADMIN` convidando.
- **Pré-condições:** e-mail ainda não cadastrado.
- **Fluxo:** usuário informa nome, e-mail e senha → sistema valida formato e força da senha → sistema cria usuário com status `pending`/`active` → sistema não expõe se um e-mail já existe de forma que permita enumeração de contas.
- **Pós-condições:** usuário criado, senha armazenada com hash (nunca em texto plano).
- **Regras:** [RN-011](business-rules.md#rn-011), [RN-012](business-rules.md#rn-012).
- **Prioridade:** P0.

### RF-002 — Login
- **Ator:** Usuário cadastrado.
- **Pré-condições:** conta ativa.
- **Fluxo:** usuário informa e-mail e senha → sistema valida credenciais → sistema cria sessão/token → resposta não revela se o erro foi "e-mail inexistente" ou "senha incorreta" (mensagem genérica).
- **Pós-condições:** sessão autenticada criada.
- **Regras:** rate limiting em tentativas de login ([RNF-005](non-functional-requirements.md#rnf-005)).
- **Prioridade:** P0.

### RF-003 — Logout
- **Ator:** Usuário autenticado.
- **Fluxo:** usuário solicita logout → sessão/token é invalidado no servidor (não apenas removido do cliente).
- **Prioridade:** P0.

### RF-004 — Recuperação de senha
- **Ator:** Usuário com conta existente.
- **Fluxo:** usuário informa e-mail → sistema gera token de reset de uso único e curta duração → envia (ou, no MVP sem envio de e-mail real, disponibiliza de forma segura em ambiente de desenvolvimento) link de redefinição → usuário define nova senha → token é invalidado após uso.
- **Regras:** resposta idêntica independentemente de o e-mail existir ou não (evita enumeração).
- **Prioridade:** P1.

### RF-005 — Alteração de senha (usuário autenticado)
- **Ator:** Usuário autenticado.
- **Fluxo:** usuário informa senha atual e nova senha → sistema valida senha atual → atualiza hash → invalida demais sessões ativas (opcional/documentar decisão).
- **Prioridade:** P1.

### RF-006 — Visualizar/editar perfil
- **Ator:** Usuário autenticado.
- **Fluxo:** usuário visualiza e edita nome e dados de perfil não sensíveis.
- **Prioridade:** P2.

---

## Organizações e Multi-tenancy

### RF-007 — Criar empresa/organização
- **Ator:** `PLATFORM_ADMIN` ou `ORGANIZATION_OWNER`.
- **Fluxo:** usuário informa nome, nome fantasia, segmento, CNPJ (opcional), tamanho, site, data de início do acompanhamento, moeda, timezone, metas, observações → sistema cria organização e associa o criador como `ORGANIZATION_OWNER`.
- **Regras:** [RN-001](business-rules.md#rn-001).
- **Prioridade:** P0.

### RF-008 — Editar dados da empresa
- **Ator:** `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`.
- **Prioridade:** P1.

### RF-009 — Listar empresas do usuário autenticado
- **Ator:** Usuário autenticado.
- **Fluxo:** sistema lista apenas organizações onde o usuário possui membership ativa.
- **Regras:** [RN-001](business-rules.md#rn-001).
- **Prioridade:** P0.

### RF-010 — Selecionar/trocar empresa ativa
- **Ator:** Usuário autenticado com ao menos uma membership.
- **Fluxo:** usuário seleciona uma organização entre as listadas em RF-009 → todas as chamadas subsequentes ficam escopadas a essa organização.
- **Regras:** [RN-008](business-rules.md#rn-008).
- **Prioridade:** P0.

### RF-011 — Convidar usuário para organização
- **Ator:** `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`.
- **Fluxo:** usuário informa e-mail e papel do convidado → sistema cria membership pendente/ativa vinculada à organização.
- **Prioridade:** P1.

### RF-012 — Gerenciar papéis e permissões (RBAC)
- **Ator:** `ORGANIZATION_OWNER`, `PLATFORM_ADMIN`.
- **Fluxo:** usuário altera o papel de um membro existente dentro dos papéis permitidos (`ORGANIZATION_ADMIN`, `ANALYST`, `VIEWER`).
- **Regras:** [RN-009](business-rules.md#rn-009), [RN-010](business-rules.md#rn-010).
- **Prioridade:** P0.

---

## Baseline

### RF-013 — Registrar baseline
- **Ator:** `ANALYST`, `ORGANIZATION_ADMIN`, `ORGANIZATION_OWNER`.
- **Fluxo:** usuário informa indicadores da situação "antes" (faturamento, lucro, margem, quantidade de clientes, CAC, conversão, ticket médio, investimento em marketing, leads, recorrência) → sistema cria um **novo registro versionado** de baseline, nunca sobrescreve o anterior.
- **Regras:** [RN-002](business-rules.md#rn-002).
- **Prioridade:** P0.

### RF-014 — Consultar histórico de baseline
- **Ator:** Qualquer papel com acesso à organização.
- **Fluxo:** usuário visualiza todas as versões de baseline registradas, com data de criação e autor.
- **Prioridade:** P0.

---

## Produtos e Serviços

### RF-015 — Cadastrar produto/serviço
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário informa nome, categoria, preço, custo → sistema calcula e exibe margem.
- **Regras:** [RN-003](business-rules.md#rn-003) (sem divisão por zero).
- **Prioridade:** P0.

### RF-016 — Editar/inativar produto
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário edita dados ou marca produto como inativo (soft delete lógico via campo `ativo`, não exclusão física).
- **Prioridade:** P1.

---

## Financeiro

### RF-017 — Registrar dados financeiros por período
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário informa, para um período (ex.: mês/ano), receita, custos, despesas, investimento em marketing e, quando utilizado, impostos → sistema calcula margem e lucro.
- **Regras:** um único registro financeiro por organização e período (chave composta), edição cria nova revisão ou atualiza o mesmo período (decisão registrada em ADR).
- **Prioridade:** P0.

---

## Marketing

### RF-018 — Cadastrar canal de marketing
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário cadastra canal (Google Ads, Meta Ads, Instagram, orgânico, indicação, e-mail, outros).
- **Prioridade:** P0.

### RF-019 — Cadastrar/editar campanha
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário informa nome, canal, período, investimento, impressões, cliques, leads, oportunidades, clientes, receita atribuída.
- **Regras:** [RN-005](business-rules.md#rn-005) (campanha pertence a exatamente um canal).
- **Prioridade:** P0.

---

## Funil

### RF-020 — Registrar snapshot de funil por período
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário informa valores das etapas (impressões, visitas, leads, MQL, SQL, oportunidades, clientes, recompras) para um período.
- **Regras:** [RN-006](business-rules.md#rn-006).
- **Prioridade:** P0.

---

## Motor de Métricas

### RF-021 — Calcular e exibir métricas derivadas
- **Ator:** Sistema (motor de métricas), consumido por qualquer papel com acesso de leitura.
- **Fluxo:** a partir dos dados registrados (financeiro, campanhas, funil), o sistema calcula receita, lucro, margem, CAC, ROAS, ROI, LTV, conversão, ticket médio, CPL, CPA, CTR, CPC, CPM, retenção, churn, recorrência, conforme fórmulas documentadas em [metrics-catalog.md](../analytics/metrics-catalog.md).
- **Regras:** [RN-003](business-rules.md#rn-003), [RN-004](business-rules.md#rn-004) — nunca dividir por zero, nunca tratar dado ausente como zero.
- **Prioridade:** P0.

### RF-022 — Comparar períodos (antes × depois)
- **Ator:** Qualquer papel com acesso de leitura.
- **Fluxo:** usuário seleciona dois pontos de comparação (baseline, período anterior, mesmo período ano anterior, início do acompanhamento, período atual) → sistema exibe valor absoluto, variação absoluta e variação percentual, sem declarar causalidade.
- **Regras:** [RN-007](business-rules.md#rn-007).
- **Prioridade:** P0.

---

## Dashboard

### RF-023 — Visualizar dashboard executivo
- **Ator:** Qualquer papel com acesso de leitura.
- **Fluxo:** sistema exibe receita, lucro, margem, CAC, ROAS, conversão, ticket médio, LTV, cada um com valor atual, período anterior, variação, tendência, fonte e última atualização.
- **Prioridade:** P0.

---

## Experimentos / CRO

### RF-024 — Criar experimento
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário informa hipótese, página/processo, variante A, variante B, métrica principal, métricas secundárias, datas, amostra planejada.
- **Prioridade:** P1.

### RF-025 — Registrar resultado de experimento
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário registra conversões por variante e data final → sistema calcula resultado, mas não declara "vencedor" automaticamente sem critério estatístico documentado.
- **Regras:** [RN-013](business-rules.md#rn-013).
- **Prioridade:** P1.

---

## Relatórios

### RF-026 — Gerar relatório básico
- **Ator:** `ANALYST` ou superior.
- **Fluxo:** usuário seleciona organização e período → sistema gera relatório consolidando dashboard e comparação antes × depois.
- **Prioridade:** P1.

---

## Auditoria

### RF-027 — Consultar trilha de auditoria
- **Ator:** `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `PLATFORM_ADMIN`.
- **Fluxo:** usuário consulta histórico de ações (quem, o quê, quando) restrito à(s) organização(ões) a que tem acesso.
- **Regras:** [RN-001](business-rules.md#rn-001).
- **Prioridade:** P1.
