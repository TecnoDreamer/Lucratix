# Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Vazamento de dados entre organizações (falha de isolamento multi-tenant) | Crítico — quebra de confiança, possível violação de LGPD/contrato | Média (é o risco mais comum em sistemas multi-tenant mal projetados) | Testes de integração explícitos provando isolamento (Fase 7); revisão de toda query por `organization_id`; princípio do menor privilégio |
| Métrica calculada incorretamente e usada para decisão de negócio | Alto — decisão de investimento equivocada, perda de credibilidade | Média | Camada central de métricas com fórmula documentada e testada (unit tests); nunca dividir por zero; nunca converter ausência de dado em zero |
| Overengineering (introduzir tecnologia antes de necessidade real) | Médio — atraso de entrega, complexidade desnecessária | Média | Protocolo de decisão (seção 28 do prompt mestre): favorecer o mais simples, documentar em ADR quando houver dúvida relevante |
| Declarar experimento de CRO "vencedor" sem rigor estatístico | Médio — decisão de produto/UX baseada em ruído | Média | Não implementar decisão automática de vencedor no MVP; documentar limitação explicitamente |
| Falta de autenticação/permissão do GitHub CLI bloqueando push/PR/criação de repositório | Baixo (mitigado) — nesta máquina, `gh` já está autenticado com escopo `repo` | Baixa | Ainda assim, qualquer push, criação de repositório remoto ou abertura de PR será feita apenas após confirmação explícita do usuário no chat, por ser uma ação visível externamente |
| Escopo do MVP crescer descontroladamente (features de "quantidade" em vez de "qualidade") | Alto — atraso, perda de foco em segurança/integridade de dados | Média | Escopo e fora-de-escopo documentados ([scope.md](scope.md), [out-of-scope.md](out-of-scope.md)); qualquer expansão de escopo passa por decisão explícita do usuário |
| Dados de desenvolvimento reais (não fictícios) entrarem no repositório | Alto — risco de exposição de dados pessoais reais | Baixa (se seguido o processo) | Seeds exclusivamente fictícios (seção 32 do prompt mestre); revisão antes de qualquer commit |
