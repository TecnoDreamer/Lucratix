# Auditoria de acessibilidade e UX — 2026-09-21

> Primeira medição automatizada de acessibilidade do Lucratix (item **B-05** do [backlog](../product/COMPETITIVE-OPPORTUNITY-BACKLOG.md); lacuna **G-11** da [gap analysis](../competitive/09-GAP-ANALYSIS.md)). Estes são **achados**, não correções: nenhum código foi alterado nesta rodada.
> **Conformidade WCAG continua `NÃO VERIFICADA`.** Ferramenta automática cobre só parte dos critérios (ver seção 6).

## 1. Método

| Item | Valor |
|---|---|
| Ferramenta | `axe-core` **4.10.2**, injetado na página (não foi adicionado ao repositório) |
| Navegador | Chromium (Playwright 1.62.1) |
| Ambiente | Aplicação local em Docker (`next dev`, Next.js 16.3.4), dados **fictícios** do seed ("Empresa Demo") |
| Viewports | Desktop 1440×900 e celular 390×844 |
| Temas | Claro (16 telas, todas as regras) · Escuro (4 telas, só contraste) |
| Telas | 3 públicas (`/login`, `/register`, `/esqueci-senha`) + `/sobre` + 13 logadas desktop + 2 celular (Home e Funil) |
| Sessão | Salva pelo usuário no Playwright (`storageState`); o login **não** foi digitado por automação |
| Data | 2026-09-21 |

Reprodução: abrir a tela, injetar `axe.min.js` e executar `axe.run(document)`. Os scripts usados estavam fora do repositório (ambiente temporário).

## 2. Resumo

**Nenhuma das 16 telas logadas passou sem violação.** Impacto segundo o axe:

| Impacto | Regra | Telas | Elementos | Resumo |
|---|---|:-:|:-:|---|
| **Crítico** | `label` | 4 | 4 | Campo de formulário sem rótulo |
| **Grave** | `color-contrast` | 16 | 108 (claro) + 15 (escuro, só Analytics) | Contraste abaixo de 4,5:1 |
| **Grave** | `scrollable-region-focusable` | 1 (celular, Funil) | 2 | Área com rolagem sem acesso por teclado |
| Moderado | `landmark-one-main` | 16 + 4 públicas | 1 por tela | Sem marca `<main>` |
| Moderado | `region` | 16 + 4 públicas | 316 (logadas) | Conteúdo fora de regiões de navegação |
| Moderado | `landmark-unique` | 13 | 13 | Duas `<nav>` na lateral sem nome próprio |
| Moderado | `page-has-heading-one` | 2 (celular) | 2 | Sem `h1` visível no celular |

Páginas públicas (medidas em separado): `/login`, `/register` e `/esqueci-senha` → `landmark-one-main` e `region`; `/sobre` → `color-contrast` (1 elemento, **grave**) e `region`.

## 3. Detalhe dos achados

### 3.1 Crítico — campos sem rótulo (`label`)

| Tela | Elemento | Onde provavelmente está |
|---|---|---|
| Dashboard | `<input type="month">` (filtro de mês) | `apps/web/src/app/organizations/[id]/dashboard/page.tsx` |
| Relatórios | `<input type="month">` (filtro de mês) | `apps/web/src/app/organizations/[id]/reports/page.tsx` |
| Central de Dados | `<input type="file" accept=".csv,.xlsx,.json">` | `apps/web/src/components/import-wizard.tsx` |
| Configurações da empresa | `<input type="file" accept=".png,.jpg,…">` (logotipo) | `apps/web/src/components/logo-uploader.tsx` |

**Correção:** `aria-label` ou `<label>` associado. Esforço: **pequeno**. Impacto real: usuário de leitor de tela não sabe o que o campo faz.

### 3.2 Grave — contraste (`color-contrast`)

Vem de **poucas combinações repetidas** (tema claro, medidas em 6 telas):

| Ocorrências | Cor sobre fundo | Razão (mín. 4,5) | Classes Tailwind |
|:-:|---|:-:|---|
| 33 | `#62748e` sobre `#f1f5f9` | **4,34** | `text-xs text-slate-500` sobre `bg-slate-100` (selos/etiquetas) |
| ~22 | `#90a1b9` sobre `#ffffff` | **2,63** | `text-slate-400` (textos secundários: "dado ausente…", "Nenhuma meta…", cabeçalho "CONTA") |
| 1 | `#009966` sobre `#ffffff` | **3,69** | `text-emerald-600` ("não aplicável" na variação) |

Tema escuro (Analytics, 15 elementos): `#45556c` (`slate-600`) sobre `#0f172b`/`#020618` → **2,35–2,65** (classe `dark:text-slate-600`). Dashboard, Funil e Financeiro têm 1 ocorrência cada.

**Escala do código** (arquivos de produção, sem testes): `text-slate-400` em **179 usos / 51 arquivos**; `text-slate-500` em 118 / 46; `dark:text-slate-600` em 12 / 11; `text-emerald-600` em 3 / 3. Nem todos falham (depende do fundo) — só os que caem sobre branco/`slate-100` no claro ou sobre fundo escuro no escuro.

**Correção sugerida:** subir um degrau nos tons de texto secundário (`slate-400 → slate-500` sobre branco; `slate-500 → slate-600` sobre `slate-100`; `emerald-600 → emerald-700`; `dark:slate-600 → dark:slate-400`), de preferência como **token de design** em vez de troca em massa. Esforço: **médio** (várias telas, revisão visual).

### 3.3 Grave — área rolável sem teclado (`scrollable-region-focusable`)
Só no **Funil no celular**: contêiner com rolagem horizontal (`.p-0`, 2 elementos) não recebe foco. Correção: `tabindex="0"` e `role`/nome no contêiner. Esforço: **pequeno**.

### 3.4 Moderado — marcas de página (`landmark-*`, `region`)
- **Só a página `/sobre` tem `<main>`** (`apps/web/src/app/sobre/page.tsx`). As telas logadas (`organizations/[id]/layout.tsx`) e de autenticação não têm → `landmark-one-main` e `region` (316 elementos).
- A lateral tem **duas `<nav>`** (linhas ~218 e ~250 do layout da empresa) sem `aria-label` → `landmark-unique`.
- No celular, `page-has-heading-one`: o `h1` some ou não existe naquela largura.

Correção: `<main>` no layout (1 linha por layout), `aria-label` nas duas `<nav>`, `h1` visível ou `sr-only`. Esforço: **pequeno**. Resolve as 3 regras moderadas de uma vez.

## 4. Outros achados (não são regras do axe)

### 4.1 Erro real de hidratação no tema escuro
Com tema escuro salvo, o console registra: *"A tree hydrated but some attributes of the server rendered HTML didn't match the client properties"*. Tema claro: **0 erros**.
**Causa:** `apps/web/src/app/layout.tsx` — o script de tema (`THEME_INIT_SCRIPT`) adiciona a classe `dark` ao `<html>` **antes** da hidratação, e o `<html>` não tem `suppressHydrationWarning`. Afeta todo usuário com tema escuro (ou "sistema" escuro). Em desenvolvimento aparece como selo vermelho "1 Issue". **Correção:** `suppressHydrationWarning` no `<html>` (1 linha). Esforço: **mínimo**.

### 4.2 Textos e conteúdo visíveis nas capturas
| Achado | Onde | Evidência |
|---|---|---|
| **Português sem acento** | Dashboard: "CONVERSAO", "TICKET MEDIO", "RECORRENCIA", "Variacao", "esta variacao e apenas observada… nao afirma… acoes" | `apps/web/messages/pt-BR.json` (~linhas 661–671); a Visão Executiva do mesmo produto está acentuada ("CONVERSÃO") |
| **Caminho de arquivo do repositório na tela** | Aviso de variação: "(ver docs/product/user-journey.md)" | Texto `variationDisclaimer` nos **3 idiomas** |
| **Nome interno de campo exposto** | "dado ausente: revenue", "marketing_investment", "conversions", "repeat_customers" | Motivo de "não aplicável" devolvido pelo motor de métricas, exibido sem tradução |
| **Rótulos de eixo cortados** | Financeiro: "jun/26" aparece como ".n/26"; "ago/26" como "ago/2" | Gráficos de tendência (captura SS-05) |
| **Número sem formatação** | Dashboard: "Baseline: 42000" ao lado de "Atual: 58200" e cartões "58.200" | Inconsistência de formato |
| **Aviso de e-mail não confirmado** | Lista de empresas, para o usuário demo | Esperado (e-mail não verificado); só ruído em capturas |
| **Nomes de empresa truncados** | Lista de empresas: "Empresa De…" | Truncamento por largura do cartão |

## 5. Ordem de correção sugerida

| # | O que | Esforço | Efeito |
|:-:|---|:-:|---|
| 1 | `suppressHydrationWarning` no `<html>` | mínimo | Elimina erro do tema escuro |
| 2 | Acentos e textos em `messages/pt-BR.json`; remover o caminho de arquivo dos 3 idiomas | pequeno | Corrige o que o usuário lê |
| 3 | `<main>` nos layouts + `aria-label` nas duas `<nav>` + `h1` no celular | pequeno | Fecha 3 regras moderadas em ~20 telas |
| 4 | Rótulo nos 4 campos | pequeno | Fecha o **único achado crítico** |
| 5 | `tabindex` na área rolável do Funil | pequeno | Fecha 1 grave |
| 6 | Traduzir/ocultar os nomes internos em "dado ausente: …" | pequeno–médio | Remove vazamento de nome técnico |
| 7 | Rótulos de eixo dos gráficos | pequeno | Legibilidade |
| 8 | Contraste (tokens de cor) claro e escuro | **médio** | Fecha o achado mais espalhado (108 + 15 elementos) |

## 6. O que **não** foi coberto

- **O axe automatizado detecta apenas parte dos problemas de acessibilidade** (estimativa comum na literatura: a minoria dos critérios WCAG). Passar no axe **não** significa acessível.
- **Não testado:** navegação só por teclado (ordem de foco, armadilhas), leitor de tela (NVDA/VoiceOver), zoom de 200 %, `prefers-reduced-motion`, estados de erro de formulários, mensagens dinâmicas (`aria-live`), gráficos (alternativas textuais — o projeto tem tabelas `sr-only`, não verificadas aqui).
- **Não auditado:** telas com papéis `ANALYST`/`VIEWER`/Super Admin, idiomas `en` e `es` (só capturados), estados vazios e de erro, o PDF gerado, `/confirmar-email` e `/redefinir-senha`.
- **Ambiente de desenvolvimento** (`next dev`): pode divergir de produção em detalhes de renderização.
- **Lighthouse e desempenho** não foram medidos.

## 7. Como repetir

1. Subir a aplicação (`docker compose up -d`) e popular o seed.
2. Salvar uma sessão pelo próprio usuário: `npx playwright codegen --save-storage="<arquivo fora do repositório>" http://localhost:3000/login` e fazer login na janela aberta.
3. Rodar o axe em cada tela (em Playwright: `page.addScriptTag` com `axe-core` e `axe.run`).
4. **Nunca versionar** o arquivo de sessão.
