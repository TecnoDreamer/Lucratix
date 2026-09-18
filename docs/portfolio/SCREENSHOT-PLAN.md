# Plano de screenshots

> Nenhuma imagem existe ainda. Este plano define **o que capturar, com que dados e o que ocultar**. Capturar somente com a empresa fictícia (`npm run seed` + `test-data/demo-company/`).
> Os IDs (SS-nn) são referenciados em [`PORTFOLIO-LUCRATIX.md`](PORTFOLIO-LUCRATIX.md) §7.

## Regras gerais

- **Ocultar/recortar sempre:** barra de endereço (UUIDs), abas do navegador, favoritos, extensões, notificações do sistema, console/DevTools, qualquer e-mail que não seja `@…exemplo`/demo, e-mail/nome do usuário do computador.
- **Nunca capturar:** chave de API recém-criada, `dev_token`, cookies, `.env`, terminal com variáveis de ambiente, `/admin` com dados reais.
- **Padrão:** 1440×900 (desktop), 390×844 (mobile); tema claro, salvo onde indicado; idioma pt-BR; dados da **Empresa Demo**.
- **Arquivos:** `docs/portfolio/img/SS-nn-slug.png` (não versionar até decidir o destino público). Verificar o EXIF/metadata.

## Capturas

| ID | Tela | Objetivo | Viewport | Estado / dados demo | Destacar | Ocultar | Legenda |
|---|---|---|---|---|---|---|---|
| SS-01 | `/login` e `/register` | Mostrar autenticação e política de senha | 1440×900 | Formulário vazio; checklist de requisitos de senha visível (preencher senha fictícia só no cadastro) | Checklist de requisitos | URL; qualquer autofill do navegador | "Cadastro com política de senha forte" |
| SS-02 | `/organizations` | Multiempresa | 1440×900 | As 3 empresas do seed | Cartões com KPIs do mês; busca | URL | "Cada cliente é uma empresa isolada" |
| SS-03 | Home da empresa `/organizations/[id]` | Acessos rápidos personalizáveis | 1440×900 | Empresa Demo | Cartões de acesso rápido; menu lateral | UUID na URL | "Acessos rápidos configuráveis por usuário" |
| SS-04 | `/dashboard` | KPIs + baseline | 1440×900 | Empresa Demo, mês com dados | Comparação com baseline; aviso de causalidade | UUID | "KPIs do mês e comparação com o baseline" |
| SS-05 | `/financials` | Lançamento mensal | 1440×900 | 3 períodos do seed | Lucro/margem derivados | UUID | "Lucro e margem são calculados, nunca digitados" |
| SS-06 | `/marketing` | Canais e campanhas | 1440×900 | Campanhas do seed | ROAS/CTR por campanha | UUID | "Retorno por campanha e canal" |
| SS-07 | `/funnel` (visão geral) | Análise do funil | 1440×900 | Período com dados | Gargalo; conversão/abandono por etapa | UUID | "Onde o funil perde mais gente" |
| SS-08 | `/funnel` (por canal + diálogo de configuração de gráfico) | Segmentação e personalização | 1440×900 | Agregado × por canal | Configuração do gráfico; tabela por canal | UUID | "Personalização do gráfico salva por usuário e empresa" |
| SS-09 | `/analytics` (Visão Executiva) | 7 KPIs, séries, metas, correlação | 1440×900 (rolar em 2 capturas) | Intervalo de vários meses | Meta e correlação | UUID | "Visão executiva por intervalo" |
| SS-10 | `/experiments` | Rigor estatístico | 1440×900 | Experimento do seed | p-valor; alerta de amostra mínima | UUID | "Sem vencedor sem amostra e significância" |
| SS-11 | `/central-de-dados` (3 passos: mapeamento, preview, confirmação) | Importação | 1440×900 | Planilha de `test-data/demo-company/` | Mapeamento de colunas; preview | Caminho do arquivo local no seletor | "Importar com mapeamento e preview" |
| SS-12 | `/reports` + 2 páginas do PDF executivo | Entregável | 1440×900 + PDF | PDF gerado da Empresa Demo | Rodapé de confidencialidade | Metadados do PDF (autor) | "Relatório executivo em PDF" |
| SS-13 | `/glossario` e ícone `?` aberto | Educação do usuário | 1440×900 | Um verbete aberto | Fórmula e "como ler" | UUID | "Glossário dentro do produto" |
| SS-14 | `/audit` | Trilha de auditoria | 1440×900 | Somente eventos do usuário demo | Filtros; ação e autor | **E-mails/IPs reais** se houver | "Quem alterou o quê" |
| SS-15 | `/configuracoes` | Ciclo de vida da empresa e seção de chaves de API (lista, **sem** chave visível) | 1440×900 | Empresa Demo | Congelar; lista de chaves | Valor da chave | "Congelar (nunca apagar) e chaves de API" |
| SS-16 | Mobile: Home + menu em gaveta aberto + Funil | Responsividade | 390×844 | Empresa Demo | Gaveta de navegação | URL | "Uso em tela estreita" |
| SS-17 | Par claro/escuro do Dashboard | Tema | 1440×900 | Mesmo estado nos dois temas | Consistência de cores | UUID | "Tema claro e escuro" |
| SS-18 | Seletor de idioma (pt-BR/en/es) na mesma tela | i18n | 1440×900 | 3 capturas do mesmo painel | Rótulos traduzidos | UUID | "Três idiomas" |
| SS-19 | `/organizations/[id]` acessado por usuário não-membro → resposta 404 | Isolamento | 1440×900 | Segunda conta demo | Página "não encontrada" | UUID | "Empresa de outro cliente não é revelada" |
| SS-20 | GitHub: checks verdes de uma PR (5 jobs) | Processo e CI | 1440×900 | PR mergeada qualquer | Lista de checks | Nomes de pessoas e e-mails fora do escopo | "CI em cada mudança" *(só vale se o repositório/print for autorizado)* |
| SS-21 | Saída do `pytest` e do Playwright no terminal | Qualidade | 1440×900 | Execução real, resumo final | Totais de testes | Caminhos locais, usuário do SO, variáveis de ambiente | "Suítes de teste" |

## Revisão antes de usar qualquer imagem

Checklist obrigatório: (1) sem UUID visível; (2) sem e-mail/nome reais; (3) sem chave/token/cookie; (4) sem caminho local; (5) dados 100 % fictícios; (6) legenda não promete resultado; (7) metadados removidos.
