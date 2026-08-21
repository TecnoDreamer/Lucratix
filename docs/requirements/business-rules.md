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

### RN-010 — `VIEWER` é somente leitura
Usuários com papel `VIEWER` não podem criar, alterar ou excluir nenhum dado — apenas visualizar dashboard, métricas, relatórios e comparação de períodos.

### RN-011 — E-mail é identificador único de usuário
Não pode haver dois usuários com o mesmo e-mail na plataforma.

### RN-012 — Não há enumeração de contas
Respostas de cadastro, login e recuperação de senha não revelam se um e-mail específico já está cadastrado.

### RN-013 — Experimento não declara vencedor automaticamente
O sistema não marca uma variante como "vencedora" apenas por ter taxa de conversão numericamente maior. A declaração de resultado deve considerar tamanho de amostra e, quando implementado, significância estatística — enquanto isso não estiver implementado, o sistema apresenta os números brutos e evita a palavra "vencedor" na ausência desse critério.

### RN-014 — Produto inativo não é excluído fisicamente
Produtos/serviços marcados como inativos permanecem no histórico (para preservar integridade de registros financeiros/campanhas passadas que os referenciam), apenas deixam de aparecer como opção para novos lançamentos.

### RN-015 — Auditoria é imutável
Registros de auditoria não podem ser editados ou excluídos por usuários da aplicação, incluindo `PLATFORM_ADMIN` via API padrão.
