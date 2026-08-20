"""Shared value types for the pre-consultation agent."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Option:
    id: str
    emoji: str
    text: str


@dataclass
class Question:
    id: str
    prompt: str
    simple_prompt: str
    options: list[Option] = field(default_factory=list)


@dataclass
class PreConsultSummary:
    chief_complaint: str = ''
    symptoms: list[dict] = field(default_factory=list)
    medications: list[str] = field(default_factory=list)
    allergies: list[str] = field(default_factory=list)
    medical_history: str = ''
    lifestyle_notes: str = ''
    vital_signs: dict = field(default_factory=dict)
    triage_context: dict = field(default_factory=dict)
    clinical_summary: str = ''
    urgency: str = 'green'
    generated_at: str = ''


TOPICS = [
    ('chief_complaint', 'Chief Complaint'),
    ('symptoms', 'Symptom Details'),
    ('medications', 'Current Medications'),
    ('allergies', 'Allergies'),
    ('history', 'Medical History'),
    ('lifestyle', 'Lifestyle'),
    ('vitals', 'Vital Signs'),
]

NOT_SURE = 'not_sure'
