from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import logger
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    generic_exception_handler
)
from app.db.mongo import close_mongo_connection
from app.db.indexes import create_all_indexes
from app.db.storage import persist_mock_store

# Import all routers
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.machines import router as machines_router
from app.api.v1.routers.lines import router as lines_router
from app.api.v1.routers.sensors import router as sensors_router
from app.api.v1.routers.readings import router as readings_router
from app.api.v1.routers.maintenance import router as maintenance_router
from app.api.v1.routers.uploads import router as uploads_router
from app.api.v1.routers.trends import router as trends_router
from app.api.v1.routers.features import router as features_router
from app.api.v1.routers.models import router as models_router
from app.api.v1.routers.evaluations import router as evaluations_router
from app.api.v1.routers.floor import router as floor_router
from app.api.v1.routers.score import router as score_router
from app.api.v1.routers.alerts import router as alerts_router
from app.api.v1.routers.reviews import router as reviews_router
from app.api.v1.routers.plan import router as plan_router
from app.api.v1.routers.reports import router as reports_router
from app.api.v1.routers.audit import router as audit_router
from app.api.v1.routers.users import router as users_router
from app.api.v1.routers.config_router import router as config_router

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PredictMaint AI Backend starting up [Formula: pm-v1]...")
    try:
        create_all_indexes()
    except Exception as e:
        logger.warning(f"Startup index notice: {e}")
    yield
    logger.info("PredictMaint AI Backend shutting down...")
    persist_mock_store()
    close_mongo_connection()

def create_app() -> FastAPI:
    app = FastAPI(
        title="PredictMaint AI — Industrial Equipment Failure & Maintenance Intelligence",
        description="Sensor-driven decision support API for industrial predictive maintenance.",
        version="1.0.0",
        lifespan=lifespan
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Health check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "environment": settings.APP_ENV,
            "formula_version": "pm-v1",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    # Mount v1 routers
    prefix = "/api/v1"
    app.include_router(auth_router, prefix=prefix)
    app.include_router(lines_router, prefix=prefix)
    app.include_router(machines_router, prefix=prefix)
    app.include_router(sensors_router, prefix=prefix)
    app.include_router(readings_router, prefix=prefix)
    app.include_router(maintenance_router, prefix=prefix)
    app.include_router(uploads_router, prefix=prefix)
    app.include_router(trends_router, prefix=prefix)
    app.include_router(features_router, prefix=prefix)
    app.include_router(models_router, prefix=prefix)
    app.include_router(evaluations_router, prefix=prefix)
    app.include_router(floor_router, prefix=prefix)
    app.include_router(score_router, prefix=prefix)
    app.include_router(alerts_router, prefix=prefix)
    app.include_router(reviews_router, prefix=prefix)
    app.include_router(plan_router, prefix=prefix)
    app.include_router(reports_router, prefix=prefix)
    app.include_router(audit_router, prefix=prefix)
    app.include_router(users_router, prefix=prefix)
    app.include_router(config_router, prefix=prefix)

    return app

app = create_app()
