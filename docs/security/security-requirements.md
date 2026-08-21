# Requisitos de Segurança (mapeamento OWASP)

Consolida os RNFs de segurança ([non-functional-requirements.md](../requirements/non-functional-requirements.md)) mapeados ao OWASP Top 10 (2021), usado como referência conforme seção 5 do prompt mestre.

| OWASP Top 10 (2021) | Como se aplica a este produto | Requisito relacionado |
|---|---|---|
| A01 Broken Access Control | Acesso cruzado entre organizações (IDOR/BOLA); escalada de papel | RNF-002, RN-008, RN-009, RN-010 |
| A02 Cryptographic Failures | Senha em texto plano; cookie sem `Secure`; dado sensível não protegido em trânsito | RNF-003, RNF-004 |
| A03 Injection | SQL Injection via input não validado | RNF-006 (uso de ORM parametrizado, sem SQL concatenado) |
| A04 Insecure Design | Ausência de baseline versionado; métrica sem tratamento de dado ausente | RN-002, RN-003, RN-004 |
| A05 Security Misconfiguration | CORS aberto; headers ausentes | RNF-007, RNF-008 |
| A06 Vulnerable and Outdated Components | Dependências com CVE conhecida | `pip-audit` e `npm audit`/`audit` no CI (seção 16) |
| A07 Identification and Authentication Failures | Força bruta; enumeração de conta | RNF-005, RN-012 |
| A08 Software and Data Integrity Failures | Migration sem reversão; dependência não verificada | RNF-013 |
| A09 Security Logging and Monitoring Failures | Ausência de trilha de auditoria; log com dado sensível | RNF-009, RNF-010 |
| A10 Server-Side Request Forgery | Não aplicável no MVP (sem funcionalidade que busca URL arbitrária fornecida por usuário); reavaliar na Fase 17 (integrações) | — |

## Testes de segurança mínimos exigidos (ver [security-testing.md](security-testing.md))

- IDOR/BOLA entre organizações.
- Acesso horizontal (mesmo papel, organização diferente) e vertical (papel inferior tentando ação de papel superior).
- Autenticação inválida (credenciais erradas, token expirado/adulterado).
- Rate limiting em login.
- Validação de entrada (payload malformado, tipos inválidos).
- Injection (garantido estruturalmente pelo uso de SQLAlchemy parametrizado, testado ao menos uma vez para confirmar).
- Manipulação de parâmetros (trocar IDs na URL/body).
- Cookies (flags `HttpOnly`/`Secure`/`SameSite` presentes).
- Headers de segurança presentes nas respostas.
- CORS restritivo (origem não permitida é rejeitada).
- Dados sensíveis ausentes em log (revisão manual + verificação automatizada quando viável).
