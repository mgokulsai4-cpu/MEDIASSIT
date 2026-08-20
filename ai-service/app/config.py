"""Central configuration, loaded from environment / .env once."""
from __future__ import annotations

import os


def _load_dotenv_if_present() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except Exception:  # pragma: no cover - dotenv is an optional dependency
        pass


_load_dotenv_if_present()


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'on')


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


class _Settings:
    """Read-only settings bag."""

    def __init__(self) -> None:
        self.host: str = os.getenv('AI_SERVICE_HOST', '0.0.0.0')
        self.port: int = _int_env('AI_SERVICE_PORT', 5001)
        self.log_level: str = os.getenv('LOG_LEVEL', 'INFO')
        self.language: str = os.getenv('LANGUAGE', 'en')

        # Optional OpenAI-compatible LLM endpoint.
        self.llm_api_url: str = os.getenv('LLM_API_URL', '').strip()
        self.llm_api_key: str = os.getenv('LLM_API_KEY', '').strip()
        self.llm_model: str = os.getenv('LLM_MODEL', '').strip()
        self.llm_timeout: float = _float_env('LLM_TIMEOUT_SECONDS', 30)

        self.service_name: str = 'medassist-ai'
        self.version: str = '1.0.0'


settings = _Settings()