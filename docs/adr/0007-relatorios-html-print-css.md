# ADR-0007 — Relatórios com impressão/PDF: HTML + Print CSS

- **Status:** Aceito, complementado
- **Data:** 2026-08-26

> **Atualização (2026-09):** a decisão de HTML + Print CSS continua valendo para a **impressão a partir da tela** (`/organizations/[id]/reports`, botão "Imprimir / Salvar como PDF"). Posteriormente foram adicionados **endpoints de PDF server-side** (`GET /reports/basic/pdf`, `/reports/executive/pdf`, `/reports/funnel/pdf`) gerados com **ReportLab** — a alternativa "geração server-side" antecipada na seção _Consequências_ deste ADR. Racional e detalhes em [`../reports/PDF_INFRAESTRUTURA.md`](../reports/PDF_INFRAESTRUTURA.md). Os dois caminhos coexistem.

## Contexto

O prompt de BI (seções 18-20) pede relatórios exportáveis em PDF e uma versão para impressão. A auditoria (`docs/auditoria/AUDITORIA_BI_RELATORIOS.md`, seção 8) já tinha levantado as opções realistas dado o stack do projeto (Next.js App Router no front, FastAPI/Python no back, sem backend Node):

1. **HTML + Print CSS (`@media print`)** — zero dependência nova, reaproveita os componentes React já existentes. A mesma superfície resolve "imprimir" e "salvar como PDF" (o navegador já sabe salvar como PDF a partir de uma tela impressa bem formatada, via Ctrl+P → "Salvar como PDF").
2. **Server-side HTML → PDF (ex. WeasyPrint)** — mais controle de paginação/cabeçalho-rodapé, mas exige bibliotecas nativas (Pango/Cairo) no container do backend, complicando o Dockerfile/deploy.
3. **PDF programático (ex. reportlab)** — layout mantido em dois lugares (tela e gerador de PDF), alto custo de manutenção.

Dos 5 tipos de relatório pedidos no prompt (Executivo, Vendas, Lucratividade, por Produto, Prejuízos), só o **Executivo** é sustentado pelos dados atuais — os outros dependem de um modelo de vendas transacional que não existe (decisão de escopo já confirmada com o usuário, ver auditoria seção 4).

## Decisão

**HTML + Print CSS**, sem dependência nova:

- `apps/web/src/app/globals.css` ganhou um bloco `@media print` com `@page { margin: 1.5cm; }` e uma paleta clara forçada via custom properties (`--background`, `--foreground` etc.), como camada de defesa.
- O tema escuro é removido antes da impressão via `beforeprint`/`afterprint` (`apps/web/src/components/theme-watcher.tsx`) — não só CSS: as classes `dark:text-*` do Tailwind são literais (não seguem `prefers-color-scheme`), e navegadores não imprimem `background-color` por padrão mas imprimem `color` — texto claro sobre fundo branco no papel ficaria ilegível sem isso. A troca cobre tanto o botão dedicado quanto Ctrl+P direto, e restaura o tema salvo do usuário depois (`afterprint`).
- Sidebar, topbar mobile e todo controle interativo (filtro de mês, botão de imprimir, alertas de erro) usam a classe `print:hidden` do Tailwind (`apps/web/src/app/organizations/[id]/layout.tsx`, `apps/web/src/app/organizations/[id]/reports/page.tsx`) — só o conteúdo do relatório permanece na folha impressa.
- Cards usam `print:break-inside-avoid` para não cortar um card ao meio entre páginas.
- O relatório (`/organizations/[id]/reports`) ganhou um botão "Imprimir / Salvar como PDF" (`window.print()`) e passou a incluir também as métricas de marketing do período (ROAS/ROI/CTR/CPC/CPM/CPL/CPA, via `GET /analytics/marketing` — endpoint já existente, sem mudança de backend nesta etapa).

## Alternativas consideradas

- **WeasyPrint no backend:** rejeitada por agora — dependência de sistema nova (Pango/Cairo) no Dockerfile, e o volume de uso atual não justifica o controle extra de paginação. Fica como evolução futura se a necessidade de "PDF no clique, sem depender da caixa de diálogo do navegador" justificar.
- **Forçar tema claro só via CSS (sem JS):** tentado primeiro, descartado — as classes `dark:text-*` do Tailwind neste projeto são escopadas por uma classe `.dark` no `<html>` (`@custom-variant dark`, não `prefers-color-scheme`), então uma regra CSS pura em `@media print` não consegue desligá-las sem enumerar manualmente cada variante de cor usada em cada componente (frágil, alto risco de esquecer alguma). Remover a classe `.dark` via `beforeprint`/`afterprint` é mais robusto e cobre qualquer página do app, não só o relatório.

## Consequências

- Nenhuma dependência nova no backend ou frontend.
- Qualquer página do app (não só `/reports`) imprime em tema claro a partir de agora — comportamento intencional, não uma limitação do relatório especificamente.
- Se o volume de exportação crescer ou for pedido controle fino de cabeçalho/rodapé por página, a migração para geração server-side (WeasyPrint) pode ser feita depois sem afetar a UI de tela — o HTML já existente vira o ponto de partida do template.
