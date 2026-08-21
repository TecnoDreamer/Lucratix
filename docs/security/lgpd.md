# LGPD — Aplicação ao Produto

## Dados pessoais tratados

- Dados de identificação do usuário da plataforma (nome, e-mail) — ver [data-classification.md](data-classification.md).
- Eventualmente, CNPJ/dados de pessoa física vinculados a uma empresa-cliente (ex.: MEI).

## Base legal

- Execução de contrato — o tratamento do e-mail/nome do usuário é necessário para prestação do serviço (autenticação, identificação de autoria de ações).
- Legítimo interesse — trilha de auditoria, para segurança e rastreabilidade das próprias operações da consultoria.

Este produto, no MVP, não trata dados pessoais de terceiros fora do círculo direto de usuários da plataforma e da razão social/CNPJ da empresa-cliente informada pelo próprio usuário.

## Direitos do titular previstos (mesmo que o fluxo self-service completo seja de fase futura)

- **Acesso:** usuário pode consultar seus próprios dados de perfil (RF-006).
- **Correção:** usuário pode editar nome/dados de perfil (RF-006).
- **Eliminação:** deve existir, ao menos via solicitação manual ao administrador da plataforma no MVP, um processo para excluir/anonimizar dados pessoais de um usuário (RNF-018). Dado de auditoria referenciando o usuário é preservado por obrigação de rastreabilidade, mas o vínculo direto a PII pode ser anonimizado (ex.: manter `user_id` mas remover nome/e-mail do registro de usuário após confirmação).
- **Portabilidade/Exportação:** deve existir, ao menos via processo manual no MVP, forma de exportar os dados pessoais de um usuário mediante solicitação (RNF-018).

## Retenção

- Dados de conta de usuário: mantidos enquanto a conta estiver ativa; processo de exclusão sob solicitação.
- Auditoria: retenção mínima recomendada de 6 a 12 meses para fins de rastreabilidade/segurança, a confirmar com o usuário responsável pelo produto quando o volume real de uso permitir definir uma política final.
- Dados financeiros/de marketing da empresa-cliente: não são dados pessoais de titular individual na maioria dos casos (dado de pessoa jurídica), mas seguem a mesma política de isolamento e retenção enquanto o contrato entre a consultoria e o cliente estiver ativo.

## O que este documento não define ainda

- Processo formal e automatizado de exportação/exclusão self-service (fica para fase de Hardening/LGPD dedicada, quando houver volume real de usuários justificando o investimento).
- Nomeação de encarregado de dados (DPO) — decisão organizacional do usuário, fora do escopo técnico deste repositório.
