"""Report agent: patient-friendly summarization of doctor reports.

Uses an LLM when configured (``LLM_API_URL``), otherwise a deterministic
extractive summarizer. Never invents information; unknown sections stay empty.
"""
from __future__ import annotations

import json
import logging

from ...config import settings
from ...services import llm
from ...services.languages import lang

logger = logging.getLogger('medassist-ai.report')

_LABEL_MAP = [
    ('symptoms', 'main_complaint'),
    ('clinical observations', 'findings'),
    ('diagnosis', 'diagnosis'),
    ('treatment', 'treatment'),
    ('prescription', 'treatment'),
    ('follow-up', 'follow_up'),
    ('followup', 'follow_up'),
]

_FIELDS = ('main_complaint', 'findings', 'diagnosis', 'treatment', 'follow_up')


def _parse_sections(text: str) -> dict:
    fields = {field: [] for field in _FIELDS}
    current = None
    for raw_line in (text or '').splitlines():
        line = raw_line.strip()
        if not line:
            continue
        lowered = line.lower()
        matched = None
        for label, field in _LABEL_MAP:
            if lowered.startswith(label + ':'):
                matched = (field, line[len(label) + 1:].strip())
                break
        if matched:
            field, value = matched
            if value:
                fields[field].append(value)
            current = field
        elif current:
            fields[current].append(line)

    return {field: ' '.join(values) for field, values in fields.items()}


def _llm_summary(text: str, diagnosis: str) -> dict | None:
    """Attempt an LLM summary. Returns None on any failure."""
    instruction = lang.t('report.llm_system')
    user = (
        'Report:\n' + text
        + ('\nDoctor diagnosis: ' + diagnosis if diagnosis else '')
        + '\nReturn only valid JSON.'
    )
    try:
        raw = llm.chat_completion(system=instruction, user=user, max_tokens=600)
    except Exception as exc:  # network / provider errors are non-fatal
        logger.warning('LLM summary failed, using extractive fallback: %s', exc)
        return None

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        # Some models wrap JSON in fences — try to extract the object.
        start, end = raw.find('{'), raw.rfind('}')
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            return None

    if not isinstance(data, dict):
        return None
    clean = {field: '' for field in _FIELDS}
    for field in _FIELDS:
        value = data.get(field)
        if value is not None:
            clean[field] = str(value).strip()
    return clean


def summarize_report(text: str, diagnosis: str = '') -> dict:
    """Produce ``{'ai_summary': {...}, 'model_used': str}``."""
    parsed = _parse_sections(text)
    if not any(parsed.values()) and diagnosis:
        parsed['diagnosis'] = diagnosis

    if llm.is_configured():
        llm_out = _llm_summary(text, diagnosis)
        if llm_out is not None:
            model = settings.llm_model or ('llm-' + (settings.llm_api_url or 'default'))
            return {'ai_summary': llm_out, 'model_used': model}

    return {'ai_summary': parsed, 'model_used': 'extractive-heuristic-v1'}