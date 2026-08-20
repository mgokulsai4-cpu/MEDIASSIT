"""Shared value types for the triage agent."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


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
class PatientContext:
    age: Optional[int] = None
    gender: Optional[str] = None
    existing_conditions: Optional[list[str]] = None


URGENCY_LEVELS = ('green', 'yellow', 'orange', 'red')
SEVERITY_LEVELS = ('mild', 'moderate', 'severe')