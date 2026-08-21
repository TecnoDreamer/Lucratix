# Requisitos Não Funcionais

| ID | Categoria | Requisito | Prioridade |
|---|---|---|---|
| RNF-001 | Segurança | Toda rota autenticada deve validar sessão/token em cada requisição; nenhuma rota de dado de organização é acessível sem autenticação. | P0 |
| RNF-002 | Segurança / Multi-tenancy | Toda consulta a dado pertencente a uma organização deve ser filtrada por `organization_id` derivado da sessão/membership do usuário, nunca de um parâmetro de entrada não validado contra a membership. | P0 |
| RNF-003 | Segurança | Senhas armazenadas com algoritmo de hash moderno e lento (ex.: bcrypt/argon2), nunca reversível, nunca em texto plano em log ou banco. | P0 |
| RNF-004 | Segurança | Cookies de sessão, quando usados, devem ser `HttpOnly`, `Secure` (em produção) e `SameSite=Lax` ou `Strict`. | P0 |
| RNF-005 | Segurança | Rate limiting em endpoints de autenticação (login, recuperação de senha) para mitigar força bruta. | P1 |
| RNF-006 | Segurança | Toda entrada de usuário é validada no back-end (Pydantic), independentemente de validação no front-end. | P0 |
| RNF-007 | Segurança | CORS restritivo — apenas origens explicitamente permitidas por ambiente. | P0 |
| RNF-008 | Segurança | Headers de segurança HTTP (ex.: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` básico) aplicados nas respostas da API. | P1 |
| RNF-009 | Auditoria | Toda operação de criação/alteração/exclusão em dado de organização deve gerar registro de auditoria com usuário, ação, entidade, timestamp. | P0 |
| RNF-010 | Observabilidade | Logs estruturados, com request ID/correlation ID, sem dados sensíveis (senha, token, cookie, secret, dado pessoal desnecessário). | P0 |
| RNF-011 | Integridade de dados | Cálculo de métrica nunca resulta em erro não tratado por divisão por zero; retorna explicitamente "não aplicável" quando o denominador é zero ou o dado de origem está ausente. | P0 |
| RNF-012 | Integridade de dados | Ausência de dado (`null`/"não disponível") nunca é convertida silenciosamente em `0`. | P0 |
| RNF-013 | Confiabilidade | Migrations de banco devem ser reversíveis sempre que tecnicamente viável, e testadas antes do merge. | P0 |
| RNF-014 | Testabilidade | Regras de negócio, fórmulas de métricas e autorização multi-tenant possuem cobertura de teste automatizado antes de serem consideradas concluídas. | P0 |
| RNF-015 | Usabilidade | Interface responsiva (funcional em desktop e mobile) nas telas do MVP. | P1 |
| RNF-016 | Manutenibilidade | Lógica de cálculo de métrica implementada em camada separada da UI e da camada HTTP (testável isoladamente). | P0 |
| RNF-017 | Performance | Rotas de leitura do dashboard devem responder em condição normal de desenvolvimento sem N+1 queries evidentes; otimização de carga fica para a Fase 18 (Hardening), não bloqueia o MVP. | P2 |
| RNF-018 | Conformidade (LGPD) | O sistema deve prever exportação e exclusão de dados pessoais de um usuário mediante solicitação, mesmo que o fluxo completo de auto-atendimento seja implementado em fase posterior. | P1 |
| RNF-019 | Portabilidade | Ambiente de desenvolvimento local deve subir via Docker Compose com o mínimo de passos manuais (ver seção "Como rodar" do README). | P1 |
| RNF-020 | Documentação | API deve expor documentação OpenAPI válida e atualizada automaticamente a partir do código (FastAPI). | P0 |

## Notas

- RNF-002 é o requisito não funcional mais crítico do produto — a violação de isolamento entre organizações é o principal risco identificado em [risks.md](../product/risks.md) e será validada por teste de integração explícito na Fase 7.
- Performance (RNF-017) é deliberadamente P2 nesta fase, conforme a regra de não otimizar prematuramente (seção 15/28 do prompt mestre).
