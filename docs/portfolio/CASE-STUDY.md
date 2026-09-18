# Estudo de caso — "Dado ausente nunca vira zero"

> Formato: problema → decisão → execução → resultado observável → aprendizado. Tudo abaixo é verificável no repositório; **não há resultado de negócio** — o produto está em pré-produção e nenhum uso real foi medido.

## 1. O problema

Em planilhas de marketing, uma célula vazia costuma ser lida como `0`. Isso produz indicadores que mentem sem parecer errados:

- **CAC = 0** quando falta o dado de investimento — parece "aquisição de graça", é só dado que não existe.
- **Margem "0%"** quando não houve receita informada — parece resultado ruim, é ausência de base.
- **Divisão por zero** que estoura erro ou vira `Infinity`/`NaN` na tela.

Quem toma decisão com esses números não tem como distinguir "medi e deu zero" de "não medi".

## 2. A decisão

Transformar a distinção em **regra do produto**, não em cuidado individual:

- Quatro estados possíveis para um valor: **zero real**, **não preenchido**, **não disponível** e **não aplicável** (RN-004).
- Nenhuma métrica divide por zero: o resultado é explicitamente "não aplicável" (RN-003).
- As fórmulas moram num único lugar, **puro** (sem banco nem HTTP), para poderem ser testadas exaustivamente e reaproveitadas.

Alternativa descartada: tratar caso a caso em cada tela/endpoint. Foi rejeitada porque a regra se perderia na primeira tela nova.

## 3. A execução

- `apps/api/app/modules/metrics/engine.py`: cada função devolve `MetricResult{value, is_applicable, reason}`. Sem exceção, sem `0` por ausência.
- Razões (margem, conversão, CTR…) guardadas em **0–1**; o `× 100` só existe na renderização — evita "percentual de percentual".
- A UI mostra "não aplicável" com o motivo e o Glossário explica como interpretar; a comparação antes × depois traz o aviso de que variação **não** prova causa (RN-007).
- Os relatórios PDF seguem o mesmo contrato.

## 4. Resultado observável

| Evidência | Onde |
|---|---|
| 72 testes unitários só do motor | `tests/unit/test_metrics_engine.py` |
| Comportamento verificável pela API: receita `0` → `margin: null` | `tests/api/test_financials.py` (`test_margin_not_applicable_when_revenue_is_zero`) |
| Rejeição de entrada absurda (receita negativa etc.) com 422 | `tests/api/test_financials.py`, RN-017 |
| Regra documentada e rastreável | RN-003, RN-004 em [`business-rules.md`](../requirements/business-rules.md) |

O que **não** se pode dizer: que isso melhorou decisões de algum cliente. Não foi medido.

## 5. O contra-exemplo que a própria auditoria achou

Mesmo com o motor como fonte única, a auditoria de 2026-09-10 encontrou que o **lucro e a margem** estavam calculados **duas vezes**: no motor e, de novo, dentro do schema de saída do financeiro. Idênticos hoje, mas nada garantia que continuariam. Correção: o schema passou a delegar ao motor (PR #131), sem mudança de comportamento, validada pelos testes de API existentes.

Na mesma auditoria, apareceram outras lacunas do mesmo tipo — campos coletados que nunca alimentam um indicador (L-06, L-07) e funções de LTV/churn no motor sem nenhuma tela que as use (L-02). Elas continuam **abertas e documentadas**: dependem de decisão de produto, não de correção técnica.

## 6. O que aprendi

1. **Uma regra de dados só vale se estiver no único lugar por onde o dado passa.** Ter o motor não bastou; a duplicação escondida no schema era um vazamento da regra.
2. **Testes de contrato protegem mais que testes de fórmula.** "Ausência ≠ zero" precisa ser testado nas bordas da API, não só na função.
3. **Documentar o que falta gera confiança.** A lista de lacunas abertas é parte do produto, não vergonha dele.
4. **Auditar o próprio trabalho encontra erros do próprio autor** — inclusive números de teste citados errado, depois corrigidos (#135).

## 7. Próximo passo

Decidir, com base em uso real, se LTV/retenção/churn devem existir (exigem dado que hoje não é coletado) ou sair do motor. Sem essa decisão, o produto não os apresenta.
