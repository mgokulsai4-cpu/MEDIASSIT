"""Health endpoint used by the backend's ``aiServiceHealthy()``."""
from __future__ import annotations

from fastapi import APIRouter

from .. import __version__
from ..config import settings

router = APIRouter(tags=['health'])


@router.get('/health')
def health() -> dict:
    return {
        'status': 'ok',
        'service': settings.service_name,
        'version': __version__,
    }