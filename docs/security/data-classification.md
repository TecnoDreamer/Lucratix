# Classificação de Dados

| Dado | Classificação | Observação |
|---|---|---|
| Nome, e-mail do usuário da plataforma | Pessoal (PII) | Sujeito a LGPD ([lgpd.md](lgpd.md)) |
| Senha (hash) | Sensível/segredo | Nunca logado, nunca retornado em resposta de API |
| Nome, CNPJ, dados financeiros da empresa-cliente | Confidencial (dado de negócio do cliente da consultoria) | Isolado por organização (RNF-002); CNPJ pode ser considerado dado de pessoa jurídica identificável, tratado com o mesmo cuidado de PII quando associado a MEI/pessoa física |
| Dados de campanha e investimento em marketing | Confidencial | Isolado por organização |
| Métricas calculadas (CAC, ROAS etc.) | Confidencial | Isolado por organização; deriva de dado confidencial |
| Trilha de auditoria | Interno/confidencial | Contém referência a usuário e ação; acesso restrito a papéis administrativos (RF-027) |
| Definição de métrica (fórmula) | Interno, não sensível | Pode ser público dentro da documentação do produto |
| Dados de seed/desenvolvimento | Público (fictício) | Nunca dado real (seção 32 do prompt mestre) |

## Princípios aplicados

- **Minimização:** coletar apenas o dado necessário para as funcionalidades do MVP (ex.: CNPJ é opcional no cadastro de empresa).
- **Least privilege:** papel `VIEWER` não acessa auditoria nem dados de outros usuários; `ANALYST` não gerencia papéis.
- **Isolamento por tenant:** todo dado confidencial listado acima é escopado por `organization_id` (RNF-002).
- **Preparação para criptografia de campo:** campos como CNPJ podem futuramente ser criptografados em repouso se a análise de risco (Fase 18) indicar necessidade; o modelo de dados não impede essa evolução.
