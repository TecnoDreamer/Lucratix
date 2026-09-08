# Gráficos

Índice da documentação sobre a camada de visualização de dados do produto.

- [ARQUITETURA_DE_GRAFICOS.md](ARQUITETURA_DE_GRAFICOS.md) — componentes reutilizáveis (`ChartTooltip`), decisão de biblioteca por família de gráfico, a camada de personalização (`ChartSettingsDialog`/`useChartSettings`/persistência) e o roadmap do `ChartShell` completo (rodadas futuras).
- [PERSONALIZACAO_DE_GRAFICOS.md](PERSONALIZACAO_DE_GRAFICOS.md) — decisões de produto da personalização: matriz de compatibilidade por gráfico, presets, fluxo de aplicar/cancelar/restaurar e persistência por usuário+organização+gráfico.
- [ACESSIBILIDADE.md](ACESSIBILIDADE.md) — disciplina de acessibilidade já aplicada a todo gráfico do produto (`role="img"`, `aria-label`, tabela alternativa) e o que muda no tooltip.
- [TESTES.md](TESTES.md) — cobertura de teste dos componentes de gráfico, da personalização e da persistência (backend/frontend/E2E), e por que a lógica de conteúdo (tooltip/labels) é extraída em funções puras em vez de testada via simulação de hover no Recharts.

Ver também [`docs/analytics/CHART_DECISIONS.md`](../analytics/CHART_DECISIONS.md) — registro cronológico de qual motor visual (SVG artesanal vs. Recharts) cada gráfico usa e por quê; esta pasta documenta os padrões que atravessam gráficos (tooltip, labels), não a escolha de biblioteca em si.
