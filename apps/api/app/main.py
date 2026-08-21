from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.middleware import SecurityHeadersMiddleware
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.baselines.router import router as baselines_router
from app.modules.financials.router import router as financials_router
from app.modules.funnels.router import router as funnels_router
from app.modules.marketing.router import campaigns_router, channels_router
from app.modules.memberships.router import router as memberships_router
from app.modules.organizations.router import router as organizations_router
from app.modules.products.router import router as products_router

settings = get_settings()

app = FastAPI(
    title="Marketing Analytics, Growth & BI Platform — API",
    version="0.1.0",
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-Requested-With"],
)

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
