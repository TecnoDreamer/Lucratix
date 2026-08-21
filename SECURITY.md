# Política de Segurança

Este é um projeto em estágio inicial (pré-produção), sem usuários finais reais e sem dados reais no repositório (ver [docs/security/](docs/security/)).

## Reportando uma vulnerabilidade

Caso identifique uma vulnerabilidade neste repositório, abra uma issue privada (ou entre em contato diretamente com o mantenedor) descrevendo:

- Passos para reproduzir.
- Impacto potencial (em particular, qualquer cenário de acesso cruzado entre organizações — ver [threat-model.md](docs/security/threat-model.md)).

Não abra uma issue pública detalhando uma vulnerabilidade de acesso a dado antes que ela seja corrigida.

## Escopo de segurança prioritário

Isolamento multi-tenant (nenhum usuário deve acessar dado de organização à qual não pertence) é o requisito de segurança mais crítico do produto — ver [ADR-0003](docs/adr/0003-estrategia-multi-tenancy.md).
