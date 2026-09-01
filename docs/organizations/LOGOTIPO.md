# Logotipo por empresa (Cloudinary)

## Por que Cloudinary

Sem dependência nova de Python: upload assinado via corpo `application/x-www-form-urlencoded`
(`urllib.parse.urlencode` + `data:image/...;base64,...` no campo `file`) em vez de multipart manual —
`python-multipart` (já usado no projeto) só sabe **receber** upload, não **construir** um de saída. Custo:
~33% a mais de payload (2 MB → ~2,7 MB), dentro do limite do Cloudinary. Tier gratuito (25 créditos/mês —
1 crédito = 1 GB de storage OU 1 GB de tráfego OU 1000 transformações) confirmado suficiente para
logotipos de empresa (imagens pequenas, poucas dezenas de organizações).

Redimensionamento (`c_limit,w_512,h_512`) acontece no próprio upload, do lado do Cloudinary — evita
adicionar Pillow só para isso.

## Validação de conteúdo real

`app/modules/organizations/logo_security.py`, mesmo espírito de `imports/security.py`: a extensão
declarada nunca é confiável (trivial de falsificar) — o formato real é detectado pela assinatura de bytes
(magic bytes PNG/JPEG, `RIFF`...`WEBP` para WEBP) e comparado contra a extensão. Diverge → erro explícito
("extensão não bate com o conteúdo real"). Limites: 2 MB, PNG/JPEG/WEBP apenas — **SVG é rejeitado
deliberadamente** (pode embutir script; sem orçamento de sanitização segura nesta rodada).

## Autorização

`ORGANIZATION_OWNER`/`ORGANIZATION_ADMIN` (membership normal) **ou** Super Admin da plataforma
(`is_platform_admin=True`, sem membership na organização). Como `get_organization_context` nega por
design quem não é membro (404, preserva RNF-002), uma dependency própria e usada **só** nestes dois
endpoints resolve isso: `require_org_admin_or_platform_admin` (`app/core/deps.py`) — tenta membership
primeiro; se não achar, cai para `is_platform_admin`. Ordem de resolução deliberada para não criar um
oráculo de existência: organização inexistente → 404; membership com papel insuficiente → 403 (já revela
que a organização existe, mas não age); nem membro nem Super Admin → 404 (indistinguível de "organização
não existe" para quem não tem acesso a ela).

Auditoria registra qual dos dois caminhos foi usado (`organization.logo_updated` vs.
`organization.logo_updated_by_platform_admin`).

## Endpoints

- `POST /api/v1/organizations/{id}/logo` — multipart, campo `file`. Rate limit próprio (10 tentativas /
  5 min, `logo_upload_rate_limiter`). `503` se Cloudinary não estiver configurado
  (`CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET` vazios — mesmo padrão "vazio = desligado" do
  `RESEND_API_KEY`), `502` em falha do lado do Cloudinary — nunca grava `logo_url` parcial.
- `DELETE /api/v1/organizations/{id}/logo` — no-op (200) se já não houver logo; remoção do lado do
  Cloudinary é best-effort (nunca levanta exceção — o banco é a fonte da verdade sobre "tem logo ou não").

## Frontend

`components/logo-uploader.tsx` (preview local antes de enviar, mesmo padrão `<input type="file">` sem
drag-and-drop do wizard de importação) e `components/organization-logo.tsx` (um componente, três pontos de
uso: card da lista, sidebar da organização, cabeçalho — todos mostravam só o ícone genérico antes desta
PR). `next.config.ts` ganhou `images.remotePatterns` para `res.cloudinary.com`.
