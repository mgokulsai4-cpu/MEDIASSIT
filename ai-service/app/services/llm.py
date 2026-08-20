"""Optional OpenAI-compatible LLM client.

Used by the agents when ``LLM_API_URL`` (or ``LLM_MODEL``) is configured.
Uses only ``urllib`` from the standard library so the service stays light.
When the LLM is not configured, agents fall back to their deterministic
offline implementations.
"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from ..config import settings

logger = logging.getLogger('medassist-ai.llm')

DEFAULT_URL = 'http://127.0.0.1:11434/v1/chat/completions'


def is_configured() -> bool:
    return bool(settings.llm_api_url.strip() or settings.llm_model.strip())


def effective_model() -> str:
    return settings.llm_model or 'medassist-default'


def chat_completion(
    system: str,
    user: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 600,
    timeout: float | None = None,
) -> str:
    """Call the OpenAI-compatible endpoint and return the assistant text.

    Raises on network or shape errors so callers can fall back gracefully.
    """
    url = settings.llm_api_url or DEFAULT_URL
    payload: dict[str, Any] = {
        'model': effective_model(),
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ],
        'temperature': temperature,
        'max_tokens': max_tokens,
    }
    headers = {'Content-Type': 'application/json'}
    if settings.llm_api_key:
        headers['Authorization'] = 'Bearer ' + settings.llm_api_key

    body = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=timeout or settings.llm_timeout) as response:
            raw = response.read().decode('utf-8')
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'LLM HTTP {exc.code}: {exc.read().decode("utf-8", errors="replace")[:300]}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'LLM unreachable: {exc.reason}') from exc

    data = json.loads(raw)
    try:
        return str(data['choices'][0]['message']['content'])
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError('Unexpected LLM response shape') from exc