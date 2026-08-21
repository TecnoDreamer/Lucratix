# Jornada do Usuário (MVP)

## Jornada principal — Consultor(a)/Analista

1. **Autenticação.** Usuário faz login com e-mail e senha.
2. **Seleção de empresa.** Usuário escolhe, entre as empresas às quais tem acesso, qual organização/cliente deseja analisar.
3. **Diagnóstico inicial (baseline).** Na primeira vez com um cliente novo, registra a situação "antes" do serviço (faturamento, lucro, CAC, conversão etc.).
4. **Cadastro de produtos/serviços.** Registra o que a empresa vende, com preço, custo e margem.
5. **Registro financeiro periódico.** A cada período (ex.: mensal), registra receita, custos, despesas e investimento em marketing.
6. **Registro de campanhas e canais.** Registra investimento, impressões, cliques, leads e receita atribuída por canal/campanha.
7. **Registro de funil.** Atualiza as etapas do funil (impressões → visitas → leads → MQL → SQL → oportunidades → clientes → recompras).
8. **Consulta de métricas e dashboard.** Visualiza CAC, ROAS, conversão, ticket médio, LTV etc., já calculados pela camada de métricas.
9. **Comparação de períodos.** Compara período atual × anterior × baseline, com variação absoluta e percentual — sem afirmar causalidade automaticamente.
10. **Experimentação (CRO).** Registra hipótese, variante, métrica principal e resultado de testes A/B.
11. **Geração de relatório.** Gera relatório básico para apresentar ao cliente final.
12. **Auditoria.** Usuário autorizado consulta trilha de quem alterou o quê e quando.

## Pontos críticos de confiança (não podem falhar)

- **Passo 2 (seleção de empresa):** isolamento de dados entre organizações é inegociável — este é o requisito de segurança mais crítico do produto (ver [threat-model.md](../security/threat-model.md), a ser criado).
- **Passo 3 (baseline):** o baseline nunca pode ser sobrescrito silenciosamente — deve ficar versionado/histórico.
- **Passo 8/9 (métricas e comparação):** nenhuma métrica pode transformar dado ausente em zero, nem dividir por zero.

## Fora da jornada do MVP

- Onboarding de integrações automáticas (GA4, Google Ads, Meta Ads) — fase futura (Fase 17).
- Acesso self-service do cliente final (`VIEWER` externo) com convite por e-mail — modelo de dados prevê, UX fica para fase futura.
