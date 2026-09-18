# Lucratix — texto para LinkedIn

> Rascunhos para o autor revisar e publicar **por conta própria**. Nada foi publicado. Sem números de uso ou resultado — não existem. Links e nome: `[a definir]`.

## 1. Campo "Projetos" (título + descrição)

**Título:** Lucratix — plataforma de BI e Marketing Analytics multiempresa

**Descrição (~1.400 caracteres):**

Projeto autoral, do requisito ao pipeline de CI (produção não verificada): uma plataforma que conecta investimento em marketing a resultado financeiro, pensada para consultorias que atendem várias empresas.

O que ela faz: cada cliente é uma empresa isolada, com financeiro mensal, funil de 8 etapas e campanhas (digitados ou importados de planilha). Devolve 7 KPIs executivos, 7 de marketing e análise de gargalo do funil; guarda o baseline histórico para comparar antes × depois; gera relatórios em PDF; e traz teste A/B que não declara "vencedor" sem amostra e significância.

Decisão central: dado ausente nunca vira zero — o indicador diz "não aplicável" e explica o motivo.

Engenharia: FastAPI + PostgreSQL + Next.js/React/TypeScript; isolamento entre empresas comprovado por teste automatizado; sessão única por conta; rate limiting; auditoria; 3 idiomas; tema claro/escuro.

Qualidade: 736 testes de backend, 513 de frontend e 56 de ponta a ponta, com CI de 5 jobs (lint, tipos, testes, SAST e auditoria de dependências) em cada PR. 9 ADRs e 17 regras de negócio rastreáveis.

Processo: desenvolvimento assistido por IA (Claude Code), com decisões e aprovação de cada PR minhas.

Estágio: pré-produção, sem usuários reais. Integrações automáticas (Google Ads, Meta, GA4) ainda não existem — estão no roadmap.

## 2. Competências sugeridas (só as demonstráveis)

Python · FastAPI · PostgreSQL · SQLAlchemy · Alembic · Next.js · React · TypeScript · Tailwind CSS · Playwright · Vitest · Docker · GitHub Actions · Arquitetura de software · Multi-tenancy · Segurança de aplicações · UX/UI · Análise de dados · Documentação técnica

## 3. Rascunho de post (~900 caracteres)

Construí o Lucratix em cerca de quatro semanas, com IA como parceira de código, e a decisão de que mais me orgulho é uma regra simples: **dado ausente nunca vira zero**.

Em planilha de marketing, célula vazia vira 0 — e aí CAC "zero" parece aquisição de graça, e margem "0%" parece resultado ruim, quando na verdade é só dado que não existe. No Lucratix o indicador diz "não aplicável" e explica por quê.

Depois de construir, auditei o produto com o mesmo rigor: achei 21 lacunas, corrigi 4 (uma delas era exatamente a fórmula de lucro calculada em dois lugares) e documentei as que dependem de decisão de produto.

Está em pré-produção, sem usuários reais, e ainda valida uma hipótese que nasceu da minha experiência: falta ferramenta que ligue marketing a lucro com rigor.

Se você trabalha com consultoria de marketing e quiser conversar sobre isso, adoraria ouvir. `[link / contato — a definir]`

## 4. Cuidados antes de publicar

- Conferir se o repositório será público ou se o link será omitido (hoje é **privado**).
- Usar só capturas de tela feitas com dados fictícios ([`SCREENSHOT-PLAN.md`](SCREENSHOT-PLAN.md)).
- Não escrever "usado por", "clientes", "aumenta", "integra com Power BI/Google Ads".
