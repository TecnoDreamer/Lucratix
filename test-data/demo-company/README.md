# Empresa Demo — massa de dados de importação (CSV / XLSX / JSON)

Massa de dados fictícia, determinística (seed fixa) e end-to-end testável para
exercitar o pipeline real de importação → Analytics → exportação do Lucratix.
Gerada por [`generate_demo_data.py`](generate_demo_data.py); testada por
[`tests/api/test_demo_data_import.py`](../../tests/api/test_demo_data_import.py).

> Escopo desta rodada (confirmado com o usuário em 2026-08-31): **só geração de
> dados demo** — a arquitetura de monetização/planos/entitlements pedida no
> mesmo prompt ficou fora de escopo (ver
> `docs/analytics/CHART_DECISIONS.md`, "Fora de escopo: monetização..."), e a
> pesquisa de Looker Studio foi entregue à parte
> (`docs/analytics/LOOKER_STUDIO.md`).

## Por que não são exatamente "3 arquivos" (CSV, XLSX, JSON)

O prompt original pedia um arquivo CSV, um XLSX e um JSON, cada um cobrindo
"tudo" (financeiro + funil + campanhas). Isso não é compatível com o
importador real, então esta massa de dados foi desenhada em torno de duas
limitações verdadeiras do sistema (não hipotéticas — conferidas no código
antes de gerar qualquer arquivo):

1. **Um domínio por arquivo.** O importador (`app/modules/imports/domains.py`)
   é estritamente um-domínio-por-upload — não existe "arquivo misto" com
   financeiro + funil + campanhas juntos. Um único CSV/JSON com as três coisas
   simplesmente não tem como ser importado pelo wizard real.
2. **XLSX só lê a primeira planilha.** `parse_xlsx`
   (`app/modules/imports/parsers.py`) usa só
   `workbook.worksheets[0]` — qualquer outra aba é ignorada pelo importador
   hoje (gap real, já documentado como "XLSX multi-sheet (deferred)" na
   arquitetura de import/export). O arquivo XLSX desta massa tem 3 abas
   (`Campanhas`, `Financeiro`, `Leads`) para servir de referência visual e
   preparar o terreno para quando essa limitação for resolvida, mas **só a
   aba `Campanhas` (a primeira) é realmente importável hoje** — é o que o
   teste automatizado exercita de fato.

Por isso, cada dataset (CSV, XLSX, JSON) vira um pequeno **conjunto de
arquivos por domínio**, todos com o mesmo período/perfil mensal, em vez de um
arquivo monolítico só. Isso mantém a entrega genuinamente funcional (dá pra
rodar o wizard de importação de verdade, ponta a ponta) em vez de decorativa.

## Períodos — por que esses, e a resolução do conflito no XLSX

| Dataset | Período | Perfil mensal | Motivo |
|---|---|---|---|
| CSV | fev–mai/2026 | `recuperacao_progressiva` (fraco → médio → bom → transição) | Período pedido originalmente no prompt para o CSV, sem conflito. |
| XLSX | out/2025–jan/2026 | `bom_queda_recuperacao` (bom → médio → fraco → transição) | **Resolução de conflito**: o prompt original pedia "jan–out/2025" para o XLSX, mas isso são 10 meses — contradiz a própria regra do prompt de "4 meses por arquivo". Resolvido escolhendo um período de 4 meses que (a) termina imediatamente antes do início do CSV (jan/2026 → fev/2026: narrativa contínua, sem sobreposição) e (b) não colide com o seed de desenvolvimento já existente (`apps/api/app/seed.py`, que gera dado **relativo a `date.today()`** — nunca datas fixas passadas — então nenhuma data fixa histórica jamais colide com ele, seja qual for o dia em que o app rodar). |
| JSON | jun–set/2025 | `pico_sazonalidade_desaceleracao` (bom → médio → médio → fraco) | Período pedido originalmente no prompt para o JSON, sem conflito; termina antes do início do XLSX (set/2025 → out/2025), mantendo a mesma narrativa contínua de 12 meses (jun/2025 → mai/2026) se os três datasets forem importados juntos na mesma organização. |

Cada dataset tem um **perfil mensal diferente dos outros dois** (não
repete o mesmo desenho fraco→bom todo santo dataset) — ver coluna acima.

## Estrutura de arquivos

```
test-data/demo-company/
├── README.md                          (este arquivo)
├── demo-data-manifest.json            (períodos, perfis, contagens, sha256 por dataset)
├── generate_demo_data.py              (gerador determinístico, seed 20260831)
├── csv/
│   ├── demo-financeiro-2026-02-to-2026-05.csv     (domínio FINANCIAL_PERIODS)
│   ├── demo-funil-2026-02-to-2026-05.csv          (domínio FUNNEL_SNAPSHOTS)
│   ├── demo-marketing-2026-02-to-2026-05.csv      (domínio CAMPAIGNS)
│   └── demo-produtos-catalogo.csv                 (domínio PRODUCTS — bônus, catálogo estático)
├── xlsx/
│   └── demo-marketing-historical.xlsx  (3 abas: Campanhas [importável], Financeiro, Leads [referência])
├── json/
│   ├── demo-financeiro-2025-06-to-2025-09.json    (domínio FINANCIAL_PERIODS)
│   ├── demo-funil-2025-06-to-2025-09.json         (domínio FUNNEL_SNAPSHOTS)
│   └── demo-marketing-2025-06-to-2025-09.json     (domínio CAMPAIGNS)
└── expected/
    ├── csv-kpis.json    (KPIs esperados do dataset CSV inteiro)
    ├── xlsx-kpis.json   (KPIs esperados do dataset XLSX inteiro — só "marketing" é verificável via import real, ver acima)
    └── json-kpis.json   (KPIs esperados do dataset JSON inteiro)
```

## Cabeçalhos com alias intencional (testar o mapeamento automático)

Cada arquivo usa uma mistura de cabeçalhos canônicos e aliases reais já
suportados por `DOMAIN_REGISTRY` (`app/modules/imports/domains.py`) — nunca um
alias inventado. Exemplos: `Faturamento` (→ `revenue`), `Sessoes` (→
`visits`), `Novos clientes` (→ `customers`, funil), `Vendas` (→ `customers`,
campanhas), `Nome do produto` (→ `name`). Isso exercita de propósito a
sugestão automática de mapeamento (`suggested_mapping`) no fluxo de upload,
não só o caminho "cabeçalho já é o nome do campo".

## Cenários de dado intencionalmente incluídos

- **`null` válido** (nunca um `0` forçado): primeiro mês de cada dataset
  financeiro sem `taxes` lançado (regime tributário apurado com atraso — uma
  situação real, não um buraco no gerador); segundo mês do funil XLSX sem
  `mqls` (mudança de ferramenta de automação no meio do período).
- **`0` válido** (nunca ausência disfarçada): `repeat_purchases = 0` no
  primeiro mês do funil CSV — empresa/período novo, ninguém teve chance de
  recomprar ainda.
- **Campanha de ROAS alto e campanha de ROAS baixo (abaixo de 1, prejuízo
  real)**: em cada dataset, a campanha "principal" do mês de perfil
  `bom`/`transicao` tem ROAS alvo ~4.6×; a do mês `fraco` tem ROAS alvo
  ~0.55× (investimento maior que a receita atribuída) — cenário real de
  campanha ruim, não só "um pouco pior".

## Como importar (fluxo real, wizard de 4 passos)

Para cada arquivo de domínio (financeiro, funil, campanhas, produtos):

```bash
# 1. Upload — sugere o mapeamento automaticamente
POST /api/v1/organizations/{org_id}/imports
  multipart: domain=<FINANCIAL_PERIODS|FUNNEL_SNAPSHOTS|CAMPAIGNS|PRODUCTS>, file=<arquivo>

# 2. Confirmar o mapeamento (usar o sugerido, ou ajustar)
PUT /api/v1/organizations/{org_id}/imports/{job_id}/mapping
  {"mapping": {...}, "transform_config": {"date_format": "ISO"}}

# 3. Pré-visualizar antes de confirmar
GET /api/v1/organizations/{org_id}/imports/{job_id}/preview

# 4. Confirmar — persiste de verdade
POST /api/v1/organizations/{org_id}/imports/{job_id}/confirm
  {"duplicate_strategy": "skip"}
```

**Pré-requisito para os arquivos de campanhas**: os canais usados
(`Google Ads`, `Meta Ads`, `Instagram`, `Organico`, `LinkedIn`, `Email`,
`Referral`, `Facebook` — ver `demo-data-manifest.json` por dataset) precisam
existir antes via `POST /api/v1/organizations/{org_id}/marketing-channels`
— o importador resolve canal por nome mas **nunca cria um canal
automaticamente** (RN-005).

Para o XLSX, o mesmo fluxo funciona sem nenhuma etapa extra — o upload lê só
a primeira aba (`Campanhas`) automaticameente, então `domain=CAMPAIGNS` é o
único domínio importável a partir desse arquivo hoje.

## KPIs esperados

Cada `expected/{csv,xlsx,json}-kpis.json` traz o resultado de rodar as
**mesmas funções reais de métrica** do produto
(`app/modules/metrics/engine.py`, via `compute_dashboard_metrics` e
`compute_marketing_metrics`) sobre o dataset inteiro — nunca um número
recalculado à mão à parte, para o "esperado" nunca poder divergir do "real"
por um engano de fórmula no gerador. Cada métrica vem no formato
`{value, is_applicable, reason}`, igual ao `MetricResult` real.

**Ressalva para o XLSX**: `expected/xlsx-kpis.json` inclui `executive`
(financeiro+funil) e `marketing` (campanhas) para o dataset inteiro, mas só a
seção `marketing` é confirmável importando o arquivo `.xlsx` de verdade (só a
aba `Campanhas` é lida — ver seção acima). A seção `executive` desse arquivo
serve de referência para quando/se a limitação de multi-sheet for resolvida,
não como algo importável hoje a partir do `.xlsx`.

## Testes automatizados

`tests/api/test_demo_data_import.py` exercita, para cada arquivo, o fluxo
real via `TestClient` do FastAPI: upload → mapeamento sugerido → preview →
confirmação → persistência (`GET` do domínio) → Analytics
(`GET /analytics/executive`, `GET /analytics/marketing`) → exportação
(`GET /export/...`), comparando os KPIs computados pela API contra
`expected/*.json` com tolerância de arredondamento.

## Reprodutibilidade

```bash
cd apps/api && python ../../test-data/demo-company/generate_demo_data.py
```

Seed fixa (`20260831`, sugerida pelo próprio prompt de origem) — rodar de
novo produz exatamente os mesmos números em todos os arquivos (o único campo
que muda é `generated_at` no manifest). `demo-data-manifest.json` traz um
`sha256` por dataset (hash dos arquivos de dado, não do manifest em si) para
detectar qualquer alteração manual dos arquivos gerados.
