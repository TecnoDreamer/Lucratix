# Personas

## Persona 1 — Consultor(a) de Marketing / Dono(a) da Consultoria

- **Papel na plataforma:** `ORGANIZATION_OWNER` ou `PLATFORM_ADMIN`.
- **Contexto:** atende múltiplos clientes/empresas simultaneamente, é responsável por provar resultado e renovar contratos.
- **Objetivos:** mostrar evolução antes × depois de forma confiável; identificar canais e produtos mais lucrativos; decidir onde investir mais.
- **Frustrações atuais:** planilhas soltas por cliente; métricas calculadas de forma diferente a cada mês; dificuldade em provar causalidade sem exagerar.
- **O que precisa da plataforma:** dashboard executivo por cliente, comparação de períodos, exportação/relatório para apresentar ao cliente.

## Persona 2 — Analista de Marketing / Growth

- **Papel na plataforma:** `ANALYST`.
- **Contexto:** insere e mantém os dados operacionais (campanhas, funil, financeiro) de um ou mais clientes.
- **Objetivos:** registrar dados corretamente, sem retrabalho; entender rapidamente onde estão os gargalos do funil.
- **Frustrações atuais:** entrada de dado manual sujeita a erro; falta de validação; ausência de trilha de quem alterou o quê.
- **O que precisa da plataforma:** formulários simples e validados; histórico de alterações; alertas claros quando um dado está ausente (não "zerado").

## Persona 3 — Cliente final da consultoria (stakeholder, uso limitado/futuro)

- **Papel na plataforma:** `VIEWER` (acesso somente leitura, quando/se convidado).
- **Contexto:** dono(a) ou gestor(a) da empresa que contrata a consultoria; quer entender se o investimento em marketing está valendo a pena.
- **Objetivos:** visão simples e confiável de resultado, sem jargão técnico.
- **Frustrações atuais:** relatórios em PDF genéricos, sem transparência sobre como o número foi calculado.
- **O que precisa da plataforma:** dashboard simplificado, comparação antes × depois, linguagem de negócio (não de mídia).

## Persona 4 — Administrador(a) da Plataforma

- **Papel na plataforma:** `PLATFORM_ADMIN`.
- **Contexto:** responsável técnico pela operação da plataforma entre múltiplas organizações/consultorias (relevante caso o produto evolua para atender mais de uma consultoria).
- **Objetivos:** garantir isolamento entre organizações, auditoria, segurança e disponibilidade.
- **O que precisa da plataforma:** trilha de auditoria completa, controle de permissões, visibilidade de erros e integridade de dados.

> Observação: no MVP, o uso primário é de uma única consultoria administrando várias empresas-cliente (personas 1 e 2). A persona 3 (cliente final com acesso próprio) e o cenário multi-consultoria (persona 4 com múltiplas organizações independentes) são suportados pelo modelo de dados desde o início, mas não são o foco de UX do MVP.
