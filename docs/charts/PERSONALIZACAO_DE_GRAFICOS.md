# Personalização de gráficos

PR2 e PR3 (de 3) do redesign do Funil — camada de personalização pedida nas seções 7-13 e 21 do prompt de redesign, sobre a base visual que a PR1 já corrigiu ([`VISUALIZACOES.md`](../funnel/VISUALIZACOES.md)). Escopo: os 2 gráficos do Funil (`FunnelStagesChart`, `StageConversionChart`, vista "Agregado"). `docs/charts/ARQUITETURA_DE_GRAFICOS.md` cobre a arquitetura de componentes; este documento cobre as decisões de produto — o que cada gráfico pode personalizar e por quê.

## Persistência (seção 12, PR3)

A preferência é salva por **usuário + organização + gráfico** — cada pessoa personaliza a própria tela, cada organização é independente, e o Funil e a Conversão por etapa nunca compartilham preferência.

- **Tabela**: `user_chart_preferences` (`apps/api/app/models/user_chart_preference.py`), uma linha por `(user_id, organization_id, chart_key)`. `preferences_json` é `NULL` quando o usuário nunca configurou aquele gráfico naquela organização — distinto de um valor salvo que por acaso é igual ao padrão de hoje: se o padrão mudar numa versão futura, quem nunca configurou passa a ver o novo padrão automaticamente; quem salvou algo (mesmo o preset "Padrão" de hoje) continua vendo exatamente o que salvou. `schema_version` existe pra detectar com segurança um formato de `preferences_json` que uma versão futura do código não reconhece mais — tanto o schema Pydantic quanto `sanitizeFunnelStagesSettings`/`sanitizeStageConversionSettings` no frontend caem pro preset "Padrão" nesse caso, nunca tentam interpretar o formato desconhecido.
- **Endpoint**: `GET/PATCH /api/v1/organizations/{organization_id}/chart-preferences/{chart_key}` (`apps/api/app/modules/chart_preferences/`). Mesmo racional de `workspace_preferences` ([`ARQUITETURA_DE_GRAFICOS.md`](ARQUITETURA_DE_GRAFICOS.md)): sem `require_role`/`record_audit` (preferência pessoal de UI, não dado da organização), `get_organization_context_allow_frozen` no PATCH (empresa congelada não deveria impedir reconfigurar a própria tela), qualquer membership ativa (inclusive VIEWER) lê/escreve só a própria linha. `chart_key` fora do registro `CHART_PREFERENCE_SCHEMAS` → 404; corpo que não bate com o schema daquele `chart_key` → 422 — nunca se persiste configuração arbitrária (seção 12: "valide com schema/allowlist").
- **Frontend**: `lib/chart-preferences.ts` busca/salva a preferência (conversão explícita snake_case ↔ camelCase na borda, mesma convenção de `lib/workspace-preferences.ts` — este projeto não converte case automaticamente) e sanitiza tudo que vem do servidor antes de repassar pro Recharts. `hooks/use-chart-settings.ts` ganhou um 2º argumento opcional `persistence` que carrega a preferência no mount e salva a cada "Aplicar", **best-effort**: uma falha de rede no save não desfaz o preview já aplicado localmente nem trava a UI, só a persistência entre sessões fica pra próxima tentativa.
- **"Restaurar padrão" não grava `NULL`**: tanto escolher o preset "Padrão" quanto clicar em "Restaurar padrão" (dentro do dialog) e depois "Aplicar" salvam o mesmo objeto concreto do preset "Padrão" — não há distinção entre os dois casos. `NULL` continua existindo e significando exatamente "nunca configurou" (o estado antes de qualquer `PATCH`); simplificação deliberada, ver seção abaixo.

## Matriz de compatibilidade (seção 9)

Cada gráfico só oferece as opções que fazem sentido pra ele — a UI nunca mostra um controle sem efeito real (seção 7: "não ofereça controles sem utilidade").

| Gráfico | Tipo de gráfico | Mostrar valores | Densidade |
|---|---|---|---|
| `FunnelStagesChart` | Funil ⇄ Barras horizontais progressivas | ✓ | Confortável / Compacta |
| `StageConversionChart` | fixo (barras horizontais) | ✓ | Confortável / Compacta |

**Por que o gráfico de conversão não tem seletor de tipo**: o layout horizontal (`layout="vertical"` do Recharts) foi a correção da PR1 pro problema de nomes de transição inclinados/cortados. Reoferecer o layout vertical antigo como opção reintroduziria exatamente o bug que acabou de ser corrigido — não é uma opção omitida por esquecimento, é uma opção que nunca deveria existir aqui.

**Por que o funil pode virar barras**: é o próprio exemplo literal da seção 9 do prompt ("Funil: ✓ funnel, ✓ barras horizontais progressivas"). Nenhum dos dois gráficos jamais oferece pizza ou scatter — essas opções não têm código nenhum, não é um botão desabilitado, é a ausência total do controle.

**Nenhuma opção de legenda**: os dois gráficos são uma série só cada — uma legenda seria decorativa, mesmo critério de "sem utilidade real" da seção 7.

**Nenhuma opção de cor/paleta**: a seção 7 só pede isso condicionalmente ("caso personalização de cor seja oferecida") — não é oferecida aqui; os dois gráficos continuam na mesma cor azul do resto do produto (consistência visual entre telas).

## Presets (seção 10)

Cada preset só combina as opções acima — nunca introduz um controle novo.

| Preset | `FunnelStagesChart` | `StageConversionChart` | Racional |
|---|---|---|---|
| Padrão | Funil, valores ON, confortável | Valores ON, confortável | Comportamento de sempre (igual à PR1) |
| Compacto | Funil, valores ON, **compacta** | Valores ON, **compacta** | Só aperta espaço vertical — nunca esconde dado (seção 31: "não esconder informação") |
| Analítico | **Barras**, valores ON, confortável | Valores ON, confortável | Barras facilitam comparar valores exatos lado a lado — mais preciso que a silhueta do funil pra quem quer analisar números |
| Apresentação | Funil, **valores OFF**, confortável | **Valores OFF**, confortável | Tela mais limpa pra projeção/print — tira o texto secundário, mantém a forma visual (nome da etapa/eixo continua visível, nunca escondido por completo) |

`lib/chart-settings.ts` (`funnelStagesSettingsForPreset`/`stageConversionSettingsForPreset`) é a fonte única desta tabela — nunca duplicada em código.

## Fluxo (seção 11)

`Personalizar → alterar → preview → Aplicar`, com `Cancelar` e `Restaurar padrão`:

1. Clicar no ícone de engrenagem (`components/icons.tsx::IconSettings`) no cabeçalho do gráfico abre o dialog (`components/chart-settings-dialog.tsx`) no preset "Padrão".
2. Trocar de preset ou mexer num controle específico atualiza um **rascunho** — o gráfico por trás do dialog já renderiza a partir desse rascunho (preview ao vivo, não uma miniatura separada).
3. **Aplicar** torna o rascunho o estado ativo e salva a preferência (por usuário+organização+gráfico, ver seção acima — sobrevive a um reload, best-effort). **Cancelar**/Escape/clicar fora descarta o rascunho, volta pro que estava ativo antes (nunca salva nada). **Restaurar padrão** volta o rascunho pro preset "Padrão" sem fechar o dialog nem salvar sozinho (dá pra ajustar a partir dali) — só persiste quando "Aplicar" é clicado em seguida, como qualquer outra troca de preset.

`hooks/use-chart-settings.ts` encapsula esse estado — usado duas vezes na mesma tela (uma instância por gráfico), daí valer a pena extrair em vez de duplicar.

## Testes

Ver [`TESTES.md`](TESTES.md) — a mesma disciplina de extrair lógica pura pra fora do Recharts (já usada na PR1) se aplica aqui: `ExternalStageLabel` (o label do funil) virou exportado e testável direto, sem depender do `ResponsiveContainer` medir layout de verdade. A troca de tipo de gráfico (funil ⇄ barras) não tem um seletor de DOM confiável em jsdom — verificada manualmente num navegador real.
