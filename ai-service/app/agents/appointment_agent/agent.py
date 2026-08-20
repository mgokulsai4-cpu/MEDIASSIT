"""Appointment agent: natural-language helpers for the appointment flow."""
from __future__ import annotations

from ...services.languages import lang


def available_slots_message(
    slots: list[str] | None,
    doctor_name: str | None = None,
    date: str | None = None,
    max_preview: int = 5,
) -> str:
    slots = slots or []
    if not slots:
        return lang.t('appointment.no_slots')
    if doctor_name and date:
        head = lang.t('appointment.slots_with_doctor', doctor=doctor_name, date=date)
    else:
        head = lang.t('appointment.slots_intro')
    lines = [head]
    lines.extend(slots[:max_preview])
    if len(slots) > max_preview:
        hidden = slots[max_preview:]
        lines.append(lang.t('appointment.more_slots', count=str(len(hidden)), slots=', '.join(hidden)))
    return '\n'.join(lines)


def confirmation_message(doctor_name: str, date: str, time: str) -> str:
    return lang.t('appointment.confirmed', doctor=doctor_name, date=date, time=time)


def cancellation_message(appointment_id: str) -> str:
    return lang.t('appointment.cancelled', appointment_id=appointment_id)


def is_booking_request(text: str) -> bool:
    """Coarse heuristic: does the message look like a booking intent?"""
    lowered = text.lower()
    keywords = ('book', 'appointment', 'schedule', 'slot', 'see a doctor', 'fix a', 'booking')
    return any(k in lowered for k in keywords)