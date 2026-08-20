"""Pydantic request/response models matching the backend's aiClient contract."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    text: str


class Answer(BaseModel):
    key: str
    answer: str
    rephrased: bool = False


class PatientContext(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    existing_conditions: Optional[list[str]] = None
    allergies: Optional[list[str]] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    patient_id: Optional[str] = None
    patient_context: Optional[PatientContext] = None
    messages: list[Message] = Field(default_factory=list)
    answers: list[Answer] = Field(default_factory=list)
    simple: bool = False


class SummaryRequest(BaseModel):
    text: str
    diagnosis: str = ''


class PreConsultRequest(BaseModel):
    patient_id: Optional[str] = None
    appointment_id: Optional[str] = None
    triage_context: Optional[dict] = None
    patient_context: Optional[PatientContext] = None
    messages: list[Message] = Field(default_factory=list)
    answers: list[Answer] = Field(default_factory=list)


class SlotRecommendRequest(BaseModel):
    urgency: str = 'green'
    recommended_specialties: list[dict] = Field(default_factory=list)
    available_slots: list[dict] = Field(default_factory=list)