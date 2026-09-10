# Regras de Negócio

### RN-001 — Isolamento por organização
Nenhum usuário pode ler, criar, alterar ou excluir dados de uma organização em que não possui membership ativa. Esta regra se aplica a **toda** entidade que pertence a uma organização (baseline, produtos, financeiro, campanhas, funil, métricas, experimentos, auditoria).

### RN-002 — Baseline é histórico, não é um valor único mutável
Um novo registro de baseline nunca sobrescreve o anterior. Toda alteração de "situação antes do serviço" cria uma nova versão, preservando a anterior com sua data de criação.

### RN-003 — Nenhuma métrica divide por zero
Quando o denominador de uma fórmula de métrica é zero (ou o dado necessário está ausente), o resultado é explicitamente "não aplicável" — nunca um erro não tratado, nunca `0`, nunca `Infinity`/`NaN` exposto ao usuário.

### RN-004 — Ausência de dado ≠ zero
O sistema diferencia quatro estados possíveis para um valor numérico: `0` (valor real medido como zero), `null` (campo não preenchido), "não disponível" (deveria existir mas não foi coletado no período) e "não aplicável" (não faz sentido calcular no contexto). Nenhuma camada da aplicação pode colapsar esses estados em `0` silenciosamente.

### RN-005 — Campanha pertence a exatamente um canal
Toda campanha é vinculada a um único `marketing_channel` no momento do cadastro.

### RN-006 — Funil tem ordem fixa de etapas
As etapas do funil (impressões → visitas → leads → MQL → SQL → oportunidades → clientes → recompras) são registradas na ordem definida; a UI e a API não permitem inventar etapas fora dessa sequência no MVP.

### RN-007 — Comparação de período não implica causalidade
Toda comparação antes × depois exibida ao usuário deve deixar explícito que se trata de variação observada, não de prova de causalidade das ações realizadas — a interface e a documentação diferenciam correlação, atribuição e causalidade (seção 9 do prompt mestre).

### RN-008 — Usuário precisa de membership ativa para selecionar empresa
Um usuário sem nenhuma membership ativa não pode selecionar/operar em nenhuma organização, mesmo que esteja autenticado.

### RN-009 — Hierarquia de papéis
`PLATFORM_ADMIN` > `ORGANIZATION_OWNER` > `ORGANIZATION_ADMIN` > `ANALYST` > `VIEWER`. Um papel só pode atribuir a outro usuário um papel igual ou inferior ao seu próprio dentro da mesma organização (exceto `PLATFORM_ADMIN`, que é global e concedido fora do escopo de uma organização).

**Status (2026-08-31):** checagem real, não só regra em texto. `require_platform_admin`
(`app/core/deps.py`) protege todo `/api/v1/platform/*` — 403 sem `User.is_platform_admin=True`. Concedido
fora da aplicação (nunca autopromoção via API): `app/scripts/grant_platform_admin.py`, rodado direto
contra o banco. `PLATFORM_ADMIN` pode revogar até um `ORGANIZATION_OWNER` (não tem papel dentro da
organização, então a checagem de rank de `_ensure_can_assign_role`/`revoke_access` não se aplica a ele).
Ver [ACCESS_CONTROL.md](../security/ACCESS_CONTROL.md).

### RN-010 — `VIEWER` é somente leitura
Usuários com papel `VIEWER` não podem criar, alterar ou excluir nenhum dado. Para leitura, a regra não é uniforme entre todas as telas — decisão confirmada com o usuário em 2026-08-27, tela por tela (ver `docs/auditoria/AUDITORIA_BI_RELATORIOS.md`):

- **`VIEWER` pode ver**: Dashboard (`GET /dashboard`, `GET /dashboard/compare-to-baseline`).
- **`VIEWER` não pode ver, exige `ANALYST`+**: Analytics — Visão Executiva (`GET /analytics/executive`), Analytics — Marketing (`GET /analytics/marketing`), Relatório Executivo (`GET /reports/basic`).

A diferença não é sobre o tipo de dado (todas mostram receita/lucro/margem em algum grau) — é uma escolha de produto por tela, não uma regra geral automatizável. Ao adicionar uma nova tela de analytics/relatório, confirmar com o responsável pelo produto em qual dos dois grupos ela se encaixa, em vez de assumir.

### RN-011 — E-mail é identificador único de usuário
Não pode haver dois usuários com o mesmo e-mail na plataforma.

### RN-012 — Não há enumeração de contas
Respostas de cadastro, login e recuperação de senha não revelam se um e-mail específico já está cadastrado.

### RN-013 — Experimento não declara vencedor automaticamente
O sistema não marca uma variante como "vencedora" apenas por ter taxa de conversão numericamente maior. A declaração de resultado considera tamanho de amostra mínimo (30 por variante) e, a partir de 2026-08-31, significância estatística real: teste-z de duas proporções (`apps/api/app/modules/experiments/analysis.py`), cada variante comparada contra a Controle, nível de confiança de 95%. Mesmo com o teste implementado, o sistema nunca usa a palavra "vencedor" — devolve `is_significant`/`p_value` por variante e deixa a decisão para quem lê o resultado (ver nota explícita sobre "peeking" e ausência de correção para múltiplas comparações no próprio `note` da resposta).

> **Nota (2026-09-10):** até esta data o código também citava `RN-013` para a regra de **sessão única por conta** (autenticação). Essa regra recebeu código próprio — [RN-016](#rn-016) — e as citações em `apps/api/app/core/*`, `apps/api/app/modules/auth/*`, `apps/api/app/models/session.py` e nos docs de segurança foram reatribuídas. `RN-013` designa **apenas** a regra de experimento.

### RN-014 — Produto inativo não é excluído fisicamente
Produtos/serviços marcados como inativos permanecem no histórico (para preservar integridade de registros financeiros/campanhas passadas que os referenciam), apenas deixam de aparecer como opção para novos lançamentos.

### RN-015 — Auditoria é imutável
Registros de auditoria não podem ser editados ou excluídos por usuários da aplicação, incluindo `PLATFORM_ADMIN` via API padrão.

### RN-016 — Sessão única por conta
Uma conta só pode ter uma sessão autenticada ativa por vez. Um login bem-sucedido em qualquer dispositivo revoga imediatamente, no servidor, a sessão anterior do mesmo usuário (`uq_sessions_one_active_per_user WHERE revoked_at IS NULL`). Cada JWT — access (15 min) e refresh (7 dias) — carrega uma claim `sid` validada contra a tabela `sessions` em toda request autenticada (`app/core/deps.py::get_current_user`) e no `/auth/refresh`: assinatura e prazo válidos não bastam se a sessão foi revogada. Reset de senha e logout também revogam a sessão no servidor, não apenas no cliente.

Origem: regra existia desde a Fase de autenticação, citada no código como `RN-013` por engano até 2026-09-10 (ver nota em [RN-013](#rn-013)). Referências: `apps/api/app/core/sessions.py`, `apps/api/app/models/session.py`, `apps/api/alembic/versions/0007_sessions.py`, [AUTHENTICATION.md](../security/AUTHENTICATION.md).
