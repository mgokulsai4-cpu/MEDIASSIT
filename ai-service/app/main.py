"""MedAssist+ AI service - FastAPI application factory."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import settings
from .routes import ai, diagnose, health, preconsult, slots, summarize


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    )
    logging.getLogger('medassist-ai').info(
        'Starting %s v%s (llm=%s)',
        settings.service_name,
        __version__,
        'configured' if settings.llm_api_url or settings.llm_model else 'offline',
    )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title='MedAssist+ AI Service',
        description='AI triage, appointment, queue and report agents for MedAssist+.',
        version=__version__,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=False,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.include_router(health.router)
    app.include_router(ai.router)
    app.include_router(summarize.router)
    app.include_router(preconsult.router)
    app.include_router(slots.router)
    app.include_router(diagnose.router)

    @app.get('/')
    def root() -> dict:
        return {
            'service': settings.service_name,
            'version': __version__,
            'docs': '/docs',
            'health': '/health',
        }

    return app


app = create_app()