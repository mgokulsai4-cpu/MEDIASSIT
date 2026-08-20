"""Small language resource loader (single JSON keyed by locale)."""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from ..config import settings

_DEFAULT_DIR = Path(__file__).resolve().parents[1] / 'resources' / 'languages'


class LanguageStore:
    """Loads <locale>.json from the resources/languages folder.

    ``t('a.b.c', key=value)`` looks up a dotted key and applies ``str.format``
    with the given keyword arguments. Missing keys fall back to the raw key so
    the service never crashes on translation gaps.
    """

    def __init__(self) -> None:
        self._strings: dict[str, Any] = {}
        self._lang = 'en'
        self._lock = threading.Lock()

    def load(self, lang: str | None = None, directory: Path | None = None) -> None:
        lang = lang or settings.language
        path = (directory or _DEFAULT_DIR) / f'{lang}.json'
        if not path.exists():
            path = _DEFAULT_DIR / 'en.json'
        with self._lock:
            with path.open('r', encoding='utf-8') as handle:
                self._strings = json.load(handle)
            self._lang = path.stem

    @property
    def language(self) -> str:
        return self._lang

    def t(self, key: str, _fallback: str | None = None, **kwargs: Any) -> str:
        value: Any = self._strings
        for part in key.split('.'):
            if not isinstance(value, dict) or part not in value:
                return _fallback if _fallback is not None else key
            value = value[part]
        if not isinstance(value, str):
            return _fallback if _fallback is not None else key
        if kwargs:
            try:
                return value.format(**kwargs)
            except (KeyError, IndexError, ValueError):
                return value
        return value

    def section(self, key: str) -> dict[str, Any]:
        value: Any = self._strings
        for part in key.split('.'):
            if not isinstance(value, dict) or part not in value:
                return {}
            value = value[part]
        return value if isinstance(value, dict) else {}


lang = LanguageStore()
lang.load()