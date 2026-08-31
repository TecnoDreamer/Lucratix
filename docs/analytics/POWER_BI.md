# Power BI — arquitetura (documentação, sem integração real)

> **Escopo confirmado com o usuário em 2026-08-26** (ver `docs/auditoria/AUDITORIA_BI_RELATORIOS.md`, seção 7 e "Decisões confirmadas"): sem licença Power BI Pro/Premium nem Azure AD App Registration disponíveis hoje, esta rodada entrega **só arquitetura documentada e pontos de extensão no backend — nenhum código de integração real, nenhuma credencial, nenhum Service Principal**. Busca no repositório inteiro por `power.?bi`/`powerbi` (case-insensitive) confirma: zero ocorrências antes deste documento.
>
> **2026-08-31**: posicionado como a opção **premium/enterprise** de BI externo — `docs/analytics/LOOKER_STUDIO.md` cobre a opção **gratuita/freemium**. As duas pesquisas compartilham o mesmo pré-requisito (módulo de API key) e o mesmo modelo de segurança (`docs/security/POWER_BI_SECURITY.md`, Opção A).

## Duas formas de integração — trade-offs

Existem dois caminhos tecnicamente distintos para "ter os dados do Lucratix no Power BI", com requisitos e riscos bem diferentes. Não são uma evolução uma da outra — são escolhas independentes.

### Opção A — Conector via API REST (Power Query "Web")

O caminho **mais simples, e o único que não depende de nenhuma licença especial do Lucratix** (só da licença Power BI que o próprio cliente já tiver — Free serve para uso pessoal, Pro para compartilhar).

- No Power BI Desktop: "Obter dados" → "Web" → apontar para um endpoint de analytics (ex. `GET /api/v1/organizations/{id}/analytics/executive?date_from=&date_to=`), autenticando com um token de API (ver "Ponto de extensão" abaixo).
- Os dados saem do Lucratix e passam a viver **dentro do tenant Power BI do próprio cliente** (Power BI Desktop local, ou Power BI Service se o relatório for publicado) — o Lucratix não controla mais o dado depois desse ponto. Isso tem implicação de LGPD real, não só técnica (ver `docs/security/POWER_BI_SECURITY.md`).
- Atualização dos dados dentro do Power BI é manual (Desktop) ou agendada via gateway (Service) — não é "tempo real".

### Opção B — Embedding "app owns data"

Embutir um relatório Power BI **dentro do próprio Lucratix** (o usuário nunca abre o Power BI separadamente) — exige:

- **Power BI Premium ou Premium Per User** (a capacidade que hospeda o relatório) — Pro sozinho não é suficiente para embedding "app owns data".
- **Azure AD App Registration** com um **Service Principal** dedicado, autenticado via client credentials (client ID + secret, ou certificado) — é a identidade que o backend do Lucratix usaria para pedir um token de embed ao Power BI em nome do usuário logado.
- Um **workspace Power BI** dedicado por ambiente (ex. produção), contendo os relatórios/datasets publicados.
- **Row-Level Security (RLS)** obrigatório no dataset — sem isso, o Service Principal (que tem acesso a todo o workspace) exporia dados de todas as organizações a qualquer usuário embutido. Ver `docs/security/POWER_BI_SECURITY.md` para o porquê disso não ser opcional.

Nenhum desses quatro pré-requisitos existe hoje. **Bloqueio real, não técnico**: confirmar com o usuário se/quando ele obtém a licença Premium e faz o Azure AD App Registration antes de qualquer código desta opção ser escrito.

## Ponto de extensão no backend (não implementado)

Ambas as opções (A imediatamente, B no futuro) exigem uma forma de autenticação de API que **não existe hoje**: a API do Lucratix autentica via cookie de sessão (`access_token`/`refresh_token`, `HttpOnly`) — pensado para o SPA em `apps/web`, não para uma ferramenta externa como o Power BI Desktop, que não guarda cookie de navegador.

Quando essa necessidade for priorizada, o desenho recomendado (não implementado, só o formato do problema):

- Um mecanismo de **API key por organização**, escopado (só lê `analytics:*`, nunca escreve), rotacionável e revogável — análogo em espírito ao token de reset de senha já existente (`app/models/password_reset_token.py`: opaco, hash armazenado, nunca o valor em claro). Novo módulo `app/modules/api_keys/` seria o lugar natural.
- **Nunca** reaproveitar o JWT de sessão do usuário para isso — sessão de usuário tem prazo curto (15 min access / 7 dias refresh) e é revogada por RN-013 (sessão única); uma API key para uma ferramenta de BI de terceiros precisa de um ciclo de vida próprio, independente de o usuário estar logado no navegador.
- O endpoint de análise (`/analytics/*`) já é organization-scoped via `get_organization_context` (`app/core/deps.py`) — uma API key precisaria carregar `organization_id` + `role` do mesmo jeito que a sessão carrega hoje, para que o isolamento multi-tenant (ADR-0003, RNF-002) continue valendo sem reescrever nenhuma rota existente.

## Dados que uma integração Power BI exporia hoje

Só o que já é sustentado pelos dados atuais (mesma limitação documentada em `docs/analytics/ARCHITECTURE.md` e na auditoria) — **nenhuma métrica nova seria inventada para o Power BI**:

- `GET /analytics/executive` — receita, lucro, margem, CAC, conversão, ticket médio, recorrência, por intervalo de datas, agregado por organização/mês.
- `GET /analytics/executive/series` — os mesmos 7 KPIs de `/analytics/executive`, mas um ponto por mês de calendário em vez de somado no intervalo inteiro — a fonte natural para um gráfico de linha/coluna por mês no Power BI, sem precisar que o próprio Power BI refaça a quebra mensal.
- `GET /analytics/marketing` — ROAS, ROI, CTR, CPC, CPM, CPL, CPA, por intervalo de datas, agregado por campanha.
- `GET /analytics/executive/targets` — meta definida pelo usuário (não um dado observado) cruzada com o real: progresso agregado no intervalo pra receita/lucro (as únicas métricas aditivas), meta bruta mês a mês pras outras 5 — útil pra visualização de "real vs. meta" no Power BI, mesma limitação de agregação documentada em `docs/analytics/CHART_DECISIONS.md`.
- `GET /analytics/marketing/by-channel` — as mesmas 7 métricas de `/analytics/marketing`, quebradas por canal em vez de somadas — útil pra um gráfico de barras/tabela comparando canais no Power BI.
- `GET /analytics/executive/correlation` — coeficiente de Pearson entre duas métricas mensais escolhidas, mais os pontos mensais pareados — útil pra um gráfico de dispersão no Power BI.
- **Fora do alcance** (mesma razão da auditoria, seção 4): nada por produto, por cliente ou por venda individual — não existe modelo de vendas transacional hoje.

## Diagrama (estado futuro, se aprovado)

```
Opção A — Power Query REST
  Power BI Desktop/Service (tenant do cliente)
       ↓ HTTPS + API key (a criar)
  GET /api/v1/organizations/{id}/analytics/{executive,marketing}
       ↓
  (mesma stack já existente — sem mudança de arquitetura no backend)

Opção B — Embedding "app owns data"
  Navegador do usuário
       ↓ carrega a página do Lucratix
  Lucratix backend (Service Principal, client credentials)
       ↓ pede embed token escopado por organização (RLS obrigatório)
  Power BI Service (workspace dedicado, capacidade Premium)
       ↓ token de embed devolvido ao navegador
  <iframe>/SDK de embed renderiza o relatório dentro do Lucratix
```

## Próximos passos (quando desbloqueado)

1. Confirmar com o usuário qual opção (A, B, ou ambas) e, se B, obter a licença Premium + fazer o Azure AD App Registration.
2. Implementar o módulo de API keys (pré-requisito de A e B).
3. Se B: criar o workspace dedicado, publicar o dataset com RLS configurado por `organization_id`, implementar a geração de embed token no backend.
4. Nova auditoria de segurança específica antes de habilitar em produção — ver `docs/security/POWER_BI_SECURITY.md`.
