"""Shared value types for the slot recommendation agent."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SlotInfo:
    doctor_id: str
    doctor_name: str
    specialization: str
    date: str
    time: str
    consultation_fee: float = 0
    rating: float = 0
    experience_years: int = 0
    estimated_wait_minutes: int = 0


@dataclass
class SlotRecommendation:
    slot: SlotInfo
    score: int = 0
    reason: str = ''
