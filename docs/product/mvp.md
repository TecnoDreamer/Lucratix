# MVP

## Definição

O MVP prioriza **qualidade dos dados, segurança, rastreabilidade e métricas corretas**, não quantidade de funcionalidades (seção 1 do prompt mestre). Ver [scope.md](scope.md) para a lista completa de funcionalidades dentro do MVP.

## Critério de sucesso técnico do MVP

O MVP é considerado tecnicamente bem-sucedido quando um usuário autorizado consegue:

1. Autenticar.
2. Selecionar uma empresa.
3. Cadastrar baseline.
4. Cadastrar produtos.
5. Informar dados financeiros.
6. Registrar campanhas.
7. Informar etapas do funil.
8. Visualizar métricas calculadas.
9. Comparar períodos.
10. Comparar baseline × atual.
11. Visualizar dashboard.
12. Criar um experimento.
13. Gerar relatório básico.
14. Consultar auditoria conforme permissão.

E quando, adicionalmente:

- Dados ficam isolados entre empresas (multi-tenancy comprovado por teste automatizado).
- Testes críticos passam.
- CI está verde.
- Migrations funcionam (aplicam e, quando possível, revertem).
- Documentação está atualizada.
- Nenhuma vulnerabilidade crítica conhecida permanece sem tratamento/documentação.

## Fora do MVP

Ver [out-of-scope.md](out-of-scope.md).

## Rastreabilidade

Cada um dos 14 itens acima será associado a requisitos funcionais (RF-xxx) e critérios de aceite Given/When/Then em [traceability-matrix.md](../requirements/traceability-matrix.md), a ser produzido na Fase 2.
