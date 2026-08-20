"""Queue agent: wait-time estimation and status wording for the live queue."""
from __future__ import annotations

from ...services.languages import lang

AVG_CONSULT_MINUTES = 15

_STATUS_MESSAGES = {
    'waiting': 'queue.waiting',
    'called': 'queue.called',
    'in_consultation': 'queue.in_consultation',
    'completed': 'queue.completed',
    'cancelled': 'queue.cancelled',
}


def estimate_wait(position: int, avg_minutes: int = AVG_CONSULT_MINUTES) -> dict:
    """Estimate remaining wait for 1-based ``position`` in a queue."""
    position = max(1, int(position or 1))
    minutes = max(0, (position - 1)) * max(1, int(avg_minutes or 0))
    return {
        'position': position,
        'estimated_minutes': minutes,
        'message': lang.t('queue.eta', minutes=str(minutes or 2)),
    }


def status_message(status: str) -> str:
    key = _STATUS_MESSAGES.get(status, 'queue.unknown')
    return lang.t(key)


def position_update(queue_id: str, position: int, avg_minutes: int = AVG_CONSULT_MINUTES) -> dict:
    est = estimate_wait(position, avg_minutes)
    return {
        'queue_id': queue_id,
        'position': position,
        'message': lang.t('queue.position', position=str(position)) + ' ' + est['message'],
        'estimated_minutes': est['estimated_minutes'],
    }