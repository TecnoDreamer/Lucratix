# ADR-0005 — Baseline e auditoria como registros append-only

- **Status:** Aceito
- **Data:** 2026-08-21

## Contexto

RN-002 exige que o baseline nunca seja sobrescrito silenciosamente. RN-015 exige que auditoria seja imutável.

## Decisão

`baselines` e `audit_logs` são tabelas append-only: a camada de repositório não expõe `UPDATE`/`DELETE` para essas entidades. "Baseline vigente" é sempre o registro mais recente (`MAX(created_at)`) por organização; correções viram um **novo** registro, nunca uma edição do anterior.

## Alternativas consideradas

- **Baseline como registro único mutável, com histórico em tabela de auditoria separada:** rejeitado — duplicaria a lógica de versionamento (uma tabela para o valor atual, outra para o histórico) sem necessidade; um único append-only log é mais simples e já responde "qual era o baseline em qualquer ponto do tempo".

## Consequências

- Consultas de "baseline atual" precisam de `ORDER BY created_at DESC LIMIT 1`, não um simples `SELECT` — documentado no repositório correspondente para não ser esquecido.
- Nenhuma rota HTTP de `PUT/PATCH/DELETE` deve existir para `baselines` ou `audit_logs`.
