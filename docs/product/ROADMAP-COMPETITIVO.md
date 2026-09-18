# Roadmap competitivo

> Horizontes **sem datas** (a sequência importa mais que o prazo). Deriva de [`COMPETITIVE-OPPORTUNITY-BACKLOG.md`](COMPETITIVE-OPPORTUNITY-BACKLOG.md) (método ICE) e é **subordinado** ao roadmap de fases em [`roadmap.md`](roadmap.md) — não o substitui. Nenhum item aqui é compromisso: cada um passa pelo funil descartar → investigar → validar → planejar → implementar.
> Versão de 2026-09-18.

## Horizontes

| Horizonte | Critério |
|---|---|
| **Agora** | ICE ≥ 60 — alta evidência, alto valor, baixa fricção |
| **Próximo** | ICE 30–59, ou item que **destrava** outro |
| **Depois** | ICE 10–29 — hipóteses que precisam de validação |
| **Explorar** | ICE < 10 — pesquisar, **não** construir |

## Agora

| Categoria | Item | ICE | Observação |
|---|---|:-:|---|
| **UX / funcionalidade** | **B-01** Tela de equipe | 80 | Destrava demo honesta e o portal do cliente |
| **Pesquisa** | **B-02** Discovery com usuários | 60 | **Decisão-mãe**: o resultado reordena o resto do roadmap |
| **Documentação** | **B-03** Capturas de tela e decisão do showcase | 60 | Depende de Docker ativo e de autorização para publicar |
| **UX / qualidade** | **B-05** Auditoria de acessibilidade | 60 | Base para qualquer afirmação futura |

## Próximo

| Categoria | Item | ICE | Observação |
|---|---|:-:|---|
| **Pesquisa / UX** | **B-19** Teste de usabilidade do "primeiro valor" | 48 | Antes de B-04 |
| **UX** | **B-04** Onboarding: planilha-modelo, exemplo, estados vazios | 48 | Depende de B-19 |
| **Correção / decisão** | **B-09** Decisões L-02/21, L-06, L-07, L-08 | 40 | **Gated:** decisão do responsável |
| **Dívida técnica** | **B-06** Observabilidade mínima | 36 | |
| **Segurança / conformidade** | **B-08** LGPD self-service (issue #25) | 32 | |

## Depois

| Categoria | Item | ICE | Observação |
|---|---|:-:|---|
| **Segurança** | **B-07** Hardening (rotação de refresh, MFA, rate limit distribuído) | 24 | **Gate:** exigível **antes** de qualquer piloto com dado real (junto de B-08) |
| **UX** | **B-10** Sinalização de metas e lembrete de fechamento | 20 | Hipótese |
| **Funcionalidade** | **B-11** Relatório por audiência | 18 | Hipótese |
| **Integração** | **B-13** Template/guia de Looker Studio/Power BI | 18 | Hipótese |
| **Funcionalidade** | **B-12** Painel do `VIEWER` com logo → marca própria | 16 | Depende de B-01 |
| **Pesquisa** | **B-15** IA descritiva com salvaguardas | 12 | Só estudo, com política de uso |
| **Funcionalidade** | **B-16** Envio de relatório com lembrete | 12 | Hipótese |

## Explorar

| Categoria | Item | ICE | Observação |
|---|---|:-:|---|
| **Funcionalidade / modelo** | **B-17** Acesso por módulo | 6 | Só se o discovery mostrar uso parcial |
| **Integrações** | **B-14** Conectores (ou pipeline complementar) | 4 | **Gated:** só se H-D7 mostrar que importação não basta (issue #26 continua bloqueada) |
| **Comercial** | **B-18** Cobrança e planos | 4 | **Gated:** só com disposição a pagar comprovada |

## Por tipo de trabalho

| Tipo | Itens (por horizonte) |
|---|---|
| **Correções** | Próximo: B-09 |
| **Dívida técnica** | Próximo: B-06 |
| **UX** | Agora: B-01, B-05 · Próximo: B-19, B-04 · Depois: B-10 |
| **Funcionalidades** | Depois: B-11, B-12, B-16 · Explorar: B-17 |
| **Integrações** | Depois: B-13 · Explorar: B-14 |
| **Segurança** | Próximo: B-08 · Depois: B-07 |
| **Pesquisa** | Agora: B-02 · Próximo: B-19 · Depois: B-15 |
| **Documentação** | Agora: B-03 |
| **Comercial** | Explorar: B-18 |

## Pontos de decisão (portões)

| Portão | Quando | Pergunta | Consequência |
|---|---|---|---|
| **D1 — Evidência de demanda** | Após B-02 | H-D1, H-D2, H-D6 foram confirmadas? | **Sim** → sustenta P-A e libera o "Depois". **Não** → repensar público/tese; refazer o backlog |
| **D2 — Integração** | Após B-02 (H-D7) | Importação basta para adotar? | **Sim** → mantém B-14 em "Explorar". **Não** → B-14 sobe; abrir #26 |
| **D3 — Piloto com dado real** | Antes de qualquer uso real | B-07 e B-08 concluídos? | **Não** → **não** iniciar piloto |
| **D4 — Publicação** | Antes de tornar algo público | Checklist do showcase e do plano de capturas cumpridos; autorização explícita do autor? | **Não** → **não** publicar |
| **D5 — Monetização** | Após D1 | Há disposição a pagar comprovada? | **Não** → B-18 permanece em "Explorar" |

## O que este roadmap **não** promete

- Não promete integrações, IA, white-label, planos ou app móvel.
- Não substitui as fases 17 (integrações) e 18 (hardening) do [`roadmap.md`](roadmap.md): B-06, B-07 e B-14 **alimentam** essas fases.
- Não tem datas; a capacidade real da equipe (uma pessoa, com assistência de IA) define o ritmo.
