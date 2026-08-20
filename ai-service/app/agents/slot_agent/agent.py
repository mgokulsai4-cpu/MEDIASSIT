"""AI-based slot recommendation — ranks open slots by wait time and how soon they are."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from .types import SlotInfo, SlotRecommendation

URGENCY_RANK = {'red': 4, 'orange': 3, 'yellow': 2, 'green': 1}


def _specialty_match(slot_specialty: str, recommended_specialties: list[dict]) -> bool:
    if not recommended_specialties:
        return True
    slot_lower = (slot_specialty or '').lower()
    for spec in recommended_specialties:
        name = str(spec.get('name') or spec.get('specialty') or '').lower()
        if name and (slot_lower in name or name in slot_lower):
            return True
    return False


def _slot_datetime(date: str, time: str) -> datetime:
    for fmt in ('%Y-%m-%d %I:%M %p', '%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(f'{date} {time}'.replace('  ', ' ').strip(), fmt)
        except ValueError:
            continue
    return datetime.max


def recommend_slots(
    available_slots: list[dict],
    urgency: str = 'green',
    recommended_specialties: Optional[list[dict]] = None,
) -> list[dict]:
    if not available_slots:
        return []

    candidates: list[SlotInfo] = []
    for raw in available_slots:
        if not _specialty_match(raw.get('specialization', ''), recommended_specialties or []):
            continue
        candidates.append(SlotInfo(
            doctor_id=raw.get('doctor_id', ''),
            doctor_name=raw.get('doctor_name', ''),
            specialization=raw.get('specialization', ''),
            date=raw.get('date', ''),
            time=raw.get('time', ''),
            consultation_fee=float(raw.get('consultation_fee', 0) or 0),
            rating=float(raw.get('rating', 0) or 0),
            experience_years=int(raw.get('experience_years', raw.get('experience', 0)) or 0),
            estimated_wait_minutes=int(raw.get('estimated_wait_minutes', 0) or 0),
        ))

    if not candidates:
        return []

    ordered = sorted(candidates, key=lambda slot: _slot_datetime(slot.date, slot.time))
    urgent = URGENCY_RANK.get(urgency, 1) >= 3
    recommendations: list[dict] = []

    for index, slot in enumerate(ordered):
        score = max(0, 70 - slot.estimated_wait_minutes)
        sooner_bonus = max(0, 55 - index * 15) if urgent else max(0, 24 - index * 6)
        score += sooner_bonus
        score += int(round(slot.rating * 10))
        score += min(max(slot.experience_years, 0), 25) * 2

        reasons: list[str] = []
        if slot.estimated_wait_minutes <= 15:
            reasons.append('Short estimated wait')
        elif slot.estimated_wait_minutes <= 30:
            reasons.append('Moderate estimated wait')
        else:
            reasons.append('Longer estimated wait')
        if slot.rating >= 4.6:
            reasons.append(f'Strong patient ratings ({slot.rating:.1f})')
        elif slot.rating >= 4.0:
            reasons.append(f'Solid service rating ({slot.rating:.1f})')
        if slot.experience_years >= 12:
            reasons.append(f'{slot.experience_years} years of experience')
        elif slot.experience_years >= 5:
            reasons.append(f'{slot.experience_years} years in practice')
        if index == 0:
            reasons.append('Earliest available slot')
        if urgent:
            reasons.append('Moved up because of AI urgency')
        if not reasons:
            reasons.append('Available appointment')

        rec = SlotRecommendation(slot=slot, score=score, reason='. '.join(reasons))
        recommendations.append({
            'doctor_id': rec.slot.doctor_id,
            'doctor_name': rec.slot.doctor_name,
            'specialization': rec.slot.specialization,
            'date': rec.slot.date,
            'time': rec.slot.time,
            'consultation_fee': rec.slot.consultation_fee,
            'rating': rec.slot.rating,
            'experience_years': rec.slot.experience_years,
            'estimated_wait_minutes': rec.slot.estimated_wait_minutes,
            'score': rec.score,
            'reason': rec.reason,
        })

    recommendations.sort(key=lambda row: (-row['score'], row['estimated_wait_minutes'], row['date'], row['time']))
    return recommendations[:5]
