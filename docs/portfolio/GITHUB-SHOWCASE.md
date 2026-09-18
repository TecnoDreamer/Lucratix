# Proposta de showcase no GitHub

> O repositório do Lucratix é **privado** (`gh repo view`, 2026-09-18). Este documento **propõe** opções e um README público — **nada foi publicado nem alterado no GitHub**.

## 1. Decisão necessária (do autor)

| Opção | Como | Prós | Contras / riscos |
|---|---|---|---|
| **A. Tornar o repositório atual público** | Trocar a visibilidade após sanitização | Mostra histórico real de PRs, CI e commits; links internos passam a funcionar | Expõe todo o histórico; exige varredura de segredos **no histórico completo** (pendente), remoção de dados pessoais em `docs/environment.md`, revisão de `docs/security/` |
| **B. Repositório de vitrine separado** | Novo repo só com README, `docs/portfolio/`, capturas, diagramas, trechos de código escolhidos | Controle total do que aparece; sem risco de histórico | Não mostra CI/PRs reais; exige manutenção manual |
| **C. Não publicar código** | Usar só PDF/LinkedIn/apresentação | Zero risco de exposição | Recrutadores técnicos não veem o código |

Recomendação neutra: **B** é a via de menor risco para começar; **A** é a que mais comprova engenharia, mas só após a checklist da seção 3.

## 2. README público proposto

```markdown
# Lucratix

Plataforma de BI e Marketing Analytics multiempresa: liga investimento em marketing a
resultado financeiro, com baseline histórico e isolamento entre clientes.

> **Status:** produto funcional em **pré-produção**. Sem usuários reais e sem resultados
> de negócio medidos. Integrações automáticas (Google Ads, Meta, GA4) **não existem**;
> o dado entra por digitação ou planilha.

## O que faz
- Empresas isoladas · baseline histórico · financeiro mensal · funil de 8 etapas · campanhas
- 7 KPIs executivos + 7 de marketing · comparação antes × depois · metas · correlação
- Importação CSV/XLSX/JSON com preview · relatórios PDF · teste A/B com significância
- pt-BR / en / es · tema claro e escuro

## Decisão central
Dado ausente **nunca vira zero**: o indicador diz "não aplicável" e explica o motivo.

## Engenharia
FastAPI · PostgreSQL · Next.js/React/TypeScript · Docker · GitHub Actions
736 testes de backend · 513 de frontend · 56 E2E (números de 2026-09-18)
9 ADRs · 17 regras de negócio · auditoria própria com lacunas documentadas

## Segurança (controles verificados)
Argon2 · sessão única · isolamento por empresa testado · rate limiting · auditoria · SAST e
auditoria de dependências em CI. Sem MFA, sem certificação.

## Desenvolvimento assistido por IA
Construído com Claude Code (Anthropic); escopo, decisões e aprovação de cada PR são do autor.
O histórico de commits registra a coautoria.

## Documentação
[Portfólio](docs/portfolio/PORTFOLIO-LUCRATIX.md) · [Matriz de maturidade](docs/portfolio/01-MATRIZ-DE-MATURIDADE.md) · [Diagramas](docs/portfolio/DIAGRAMAS.md) · [Lacunas conhecidas](docs/governanca/LACUNAS_ENCONTRADAS.md)

## Demonstração
Roteiro em [`ROTEIRO-DE-DEMO.md`](docs/portfolio/ROTEIRO-DE-DEMO.md). Dados 100 % fictícios.

## Contato
`[a definir]`
```

Não incluir: badges de CI de repositório privado, contagem de estrelas/usuários, "usado por", logotipos de terceiros, credenciais do seed.

## 3. Checklist antes de publicar (opção A ou B)

- [ ] Varredura de segredos no **histórico completo** (`gitleaks detect`) — **pendente**
- [ ] Remover/ajustar `docs/environment.md` (caminho local e conta pessoal)
- [ ] Remover credenciais fictícias do seed do README público
- [ ] Definir canal de contato no `SECURITY.md`
- [ ] Padronizar links do nome antigo do repositório (`AleksGustavo/marketing-intelligence-platform`)
- [ ] Revisar `docs/security/` quanto ao nível de detalhe público (limites de rate limit, etc.)
- [ ] Definir licença (hoje: nenhuma; **não escolher sem indicação do responsável**)
- [ ] Capturas de tela aprovadas pelo checklist do [`SCREENSHOT-PLAN.md`](SCREENSHOT-PLAN.md)
- [ ] Autorização explícita do autor para publicar
