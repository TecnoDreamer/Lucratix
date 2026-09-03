# Infraestrutura de relatório em PDF (server-side)

## Decisão: ReportLab, não WeasyPrint

WeasyPrint (HTML+CSS → PDF) exigiria bibliotecas de sistema (Pango,
Cairo, GDK-PixBuf) na imagem Docker da API — o mesmo tipo de dependência
nativa que o projeto já rejeitou antes (`pyproject.toml`, comentário
sobre `openpyxl` escolhido no lugar de `pandas` justamente por ser "puro
Python, sem dependência nativa"). **ReportLab** é pip-instalável sem
nenhuma biblioteca de sistema (`reportlab-5.0.1-py3-none-any.whl` — wheel
universal, confirmado no build da imagem), com API programática
(Platypus: `Paragraph`/`Table`/`Spacer`) que mapeia bem numa estrutura de
seções fixas como a de um relatório.

**Fonte**: a fonte padrão (Helvetica, embutida no ReportLab) foi
verificada manualmente — um PDF com texto acentuado pt-BR ("Conversão",
"Não aplicável") foi gerado e lido de volta via `pypdf`, com os
codepoints Unicode conferidos byte a byte. Nenhuma fonte TTF customizada
precisou ser embutida.

## `app/modules/reports/pdf_builder.py` — blocos reutilizáveis

Camada de apresentação pura, sem nenhuma regra de negócio — qualquer
relatório futuro (a PR4 inventaria onde mais faz sentido) monta sua
lista de seções com essas funções e chama `build_pdf`:

- `section_title(text)`, `paragraph(text)`, `note(text)`, `spacer(height)`
  — wrappers finos sobre `Paragraph`/`Spacer`, com o estilo visual do
  produto (azul de marca, mesma família de cor da UI).
- `kpi_table(rows)` — tabela simples de 2 colunas (rótulo, valor).
- `data_table(header, rows, *, col_widths, highlight_row)` — tabela
  genérica de N colunas, com uma linha destacável (usado para o
  "gargalo" na conversão por etapa).
- `build_pdf(sections, *, title, subtitle, organization_name,
  generated_at)` — monta o documento final: título/subtítulo no topo,
  rodapé com "Gerado por Lucratix em \<data\>" + aviso de
  confidencialidade + numeração de página em **todas** as páginas (via
  `onFirstPage`/`onLaterPages` do ReportLab).

## Endpoint e segurança

Mesmo padrão de `exports/router.py`: `Response(content=pdf_bytes,
media_type="application/pdf", headers={"Content-Disposition": ...})` +
`record_audit(...)` + `db.commit()`. `organization_id` sempre do
contexto de RBAC (`ctx.organization_id`), nunca de um parâmetro do
cliente — mesma garantia de isolamento multi-tenant de qualquer endpoint
do projeto. Sem limite de tamanho explícito (diferente de export de
CSV/XLSX): o conteúdo de um relatório é sempre um número fixo de
seções/linhas (KPIs agregados, no máximo alguns canais e alguns meses),
nunca proporcional a uma tabela de registros arbitrária.

## `app/core/formatting.py` — formatação pt-BR no backend

Primeira vez que o backend formata número para texto (sempre foi
responsabilidade do frontend, ver `apps/web/src/lib/formatters.ts`) —
necessário porque o PDF é gerado inteiramente no servidor.
`format_integer`/`format_percentage`, sem `locale.setlocale` (estado
global de processo, arriscado num servidor multi-thread/async, e exige o
locale pt_BR instalado no SO) nem uma dependência nova (`babel`) só para
isso — troca de separador simples, mesmo resultado.

Ver [FUNIL_PDF.md](FUNIL_PDF.md) para o relatório do Funil especificamente.
