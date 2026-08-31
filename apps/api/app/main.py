from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import get_settings
from app.core.middleware import SecurityHeadersMiddleware
from app.modules.analytics.router import router as analytics_router
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.baselines.router import router as baselines_router
from app.modules.experiments.router import router as experiments_router
from app.modules.exports.router import router as exports_router
from app.modules.financials.router import router as financials_router
from app.modules.funnels.router import router as funnels_router
from app.modules.imports.router import router as imports_router
from app.modules.marketing.router import campaigns_router, channels_router
from app.modules.memberships.router import router as memberships_router
from app.modules.organizations.router import router as organizations_router
from app.modules.platform_admin.router import router as platform_admin_router
from app.modules.products.router import router as products_router
from app.modules.reports.router import router as reports_router
from app.modules.targets.router import router as targets_router

settings = get_settings()

app = FastAPI(
    title="Lucratix API",
    version="0.1.0",
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-Requested-With"],
    # Content-Disposition nao esta na lista de resposta CORS-safelisted do
    # browser (Cache-Control/Content-Language/Content-Length/Content-Type/
    # Expires/Last-Modified/Pragma) — sem isso, `fetch` em requisicao
    # cross-origin (dev local: frontend em :3000 chamando a API em :8000
    # direto, sem o rewrite same-origin que existe em producao) nao consegue
    # ler o header, e `downloadFile` (modulo de exportacao) cai no nome de
    # arquivo generico "export" em vez do nome de verdade. Verificado ao
    # vivo durante o desenvolvimento do modulo de exportacao (2026-08-29).
    expose_headers=["Content-Disposition"],
)
# Comprime respostas JSON grandes (ex.: lista de organizacoes, dashboard) —
# reduz o tamanho transferido, principalmente relevante com o backend hospedado
# fora do Brasil (Railway) enquanto o usuario/demo estao no Brasil.
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(memberships_router)
app.include_router(audit_router)
app.include_router(baselines_router)
app.include_router(products_router)
app.include_router(financials_router)
app.include_router(channels_router)
app.include_router(campaigns_router)
app.include_router(funnels_router)
app.include_router(analytics_router)
app.include_router(experiments_router)
app.include_router(reports_router)
app.include_router(imports_router)
app.include_router(exports_router)
app.include_router(targets_router)
app.include_router(platform_admin_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
