# Plano Básico de Resposta a Incidentes

> Versão inicial, proporcional ao estágio do produto (pré-produção). Deve ser revisado antes de qualquer deploy com dados reais.

## Classificação de severidade

- **Crítico:** vazamento confirmado de dado entre organizações; credencial de banco/produção exposta.
- **Alto:** vulnerabilidade de acesso cruzado identificada (mesmo sem exploração confirmada); dependência com CVE crítico em produção.
- **Médio:** falha de disponibilidade; bug de cálculo de métrica gerando número incorreto exposto ao usuário.
- **Baixo:** bug cosmético, sem impacto em dado ou segurança.

## Passos gerais

1. **Identificar e conter:** interromper o vetor (ex.: revogar credencial, desabilitar rota afetada) assim que um incidente Crítico/Alto for identificado.
2. **Registrar:** documentar o que foi observado, quando, e o impacto estimado (quais organizações/usuários potencialmente afetados).
3. **Corrigir:** aplicar correção em branch dedicada (`security/<escopo>`, seção 19 do prompt mestre), com teste que comprove a correção e que teria pego o problema antes.
4. **Comunicar:** informar o responsável pelo produto (usuário) imediatamente em caso de severidade Crítica ou Alta — nunca ocultar ou minimizar um incidente de vazamento de dado entre organizações.
5. **Pós-mortem:** para incidentes Crítico/Alto, registrar causa raiz e ação preventiva (ex.: novo teste de regressão, nova regra de lint/segurança no CI).

## Contato/responsável

Nesta fase pré-produção, o único responsável de decisão é o usuário/dono do produto. Não há usuários finais reais ainda, o que reduz a severidade prática de qualquer incidente encontrado agora — mas o processo é documentado desde já para não precisar ser inventado sob pressão.
