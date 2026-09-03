# Segurança

Índice dos documentos de segurança do projeto.

- [AUTHENTICATION.md](AUTHENTICATION.md) — funcionamento do sistema de autenticação (sessão, tokens, recuperação de senha, verificação de e-mail, rate limiting).
- [RATE_LIMITING.md](RATE_LIMITING.md) — defesa contra força bruta/credential stuffing/password spraying: as 3 dimensões de chave (IP isolado, conta isolada, combinada), resolução de IP confiável, backoff, decisão de storage.
- [LOGS_E_AUDITORIA.md](LOGS_E_AUDITORIA.md) — eventos de auditoria de autenticação/segurança, o que nunca é logado, multi-tenancy dos logs.
- [MFA.md](MFA.md) — proposta de arquitetura de MFA (TOTP) para papéis privilegiados — **não implementado**, documento de arquitetura pra uma rodada futura.
- [POLITICA_DE_SENHAS.md](POLITICA_DE_SENHAS.md) — política de senha forte (2026-09-02): requisitos, onde é aplicada, contrato de erro, hashing, legado.
- [TESTES_DE_AUTENTICACAO.md](TESTES_DE_AUTENTICACAO.md) — cobertura de teste (unitário/integração/E2E) da política de senha e dos fluxos de autenticação.
- [ACCESS_CONTROL.md](ACCESS_CONTROL.md) — controle de acesso (papéis, RBAC, exceções de Super Admin).
- [security-requirements.md](security-requirements.md) — mapeamento OWASP dos requisitos de segurança do projeto.
- [security-testing.md](security-testing.md) — estratégia geral de teste de segurança (ferramentas, casos obrigatórios).
- [threat-model.md](threat-model.md) — modelo de ameaças.
- [data-classification.md](data-classification.md) — classificação de sensibilidade de dado.
- [incident-response.md](incident-response.md) — resposta a incidente.
- [lgpd.md](lgpd.md) — conformidade LGPD.
- [POWER_BI_SECURITY.md](POWER_BI_SECURITY.md) — segurança específica da integração com Power BI.
