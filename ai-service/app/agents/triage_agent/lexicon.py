"""Triage lexicon: categories, keywords, question bank, specialty mapping.

The question bank and every user-facing string live in
``app/resources/languages/en.json`` so translations can be added without code
changes (set ``LANGUAGE`` in the environment).
"""
from __future__ import annotations

from typing import Optional

from ...services.languages import lang
from .types import Option, PatientContext, Question

# Order matters: it drives question priority when multiple categories are found.
CATEGORIES = ['fever', 'stomach', 'chest', 'breathing', 'head', 'bone', 'skin', 'ent', 'women', 'child']

CATEGORY_LABEL = {c: lang.t('category_label.' + c, _fallback=c) for c in CATEGORIES}
CATEGORY_EMOJI = {c: lang.t('category_emoji.' + c, _fallback=c) for c in CATEGORIES}

KEYWORDS: dict[str, list[str]] = {
    'fever': ['fever', 'temperature', 'chills', 'cold', 'body ache', 'body pain', 'bukhar', 'garmi', 'jwaram', 'jwar', 'gummam'],
    'stomach': ['stomach', 'abdomen', 'belly', 'vomiting', 'nausea', 'diarrhoea', 'diarrhea', 'gas', 'acidity', 'indigestion', 'poisoning', 'pet dard', 'ulti', 'dast', 'kadupu', 'kadupu noppi', 'kakkulu', 'vantulu'],
    'chest': ['chest', 'heart', 'palpitation', 'palpitations', 'cardiac', 'pounding', 'seene', 'chhati', 'dil', 'gunde', 'gundelu', 'eduru'],
    'breathing': ['breath', 'breathing', 'wheeze', 'wheezing', 'cough', 'shortness', 'suffocat', 'saans', 'khansi', 'saans lene me dikkat', 'swasam', 'dikkubadi', 'digubadi'],
    'head': ['headache', 'dizzy', 'dizziness', 'vertigo', 'faint', 'numb', 'vision', 'migraine', 'seizure', 'convulsion', 'blurred', 'sir dard', 'chakkar', 'behosh', 'kamjori', 'tala noppi', 'tala tippu', 'tala tirugu', 'moorecha'],
    'bone': ['knee', 'bone', 'joint', 'fall', 'fracture', 'back pain', 'sprain', 'swell', 'twist', 'injur', 'muscle', 'leg', 'arm', 'chot', 'haddi', 'gir', 'moch', 'sujan', 'noppi', 'eluku', 'elukula noppi', 'kaalu', 'cheyyi'],
    'skin': ['rash', 'skin', 'itch', 'itching', 'burn', 'wound', 'boil', 'acne', 'hives', 'kharish', 'daag', 'jala', 'foda', 'ghav', 'durada', 'dappulu', 'gayam', 'gayalu'],
    'ent': ['ear', 'throat', 'nose', 'hearing', 'sinus', 'tonsil', 'sore throat', 'kan dard', 'gala', 'naak', 'kan', 'chevi', 'chevi noppi', 'gonthu', 'mukku'],
    'women': ['period', 'pregnancy', 'menstrual', 'vaginal', 'pregnant', 'cramps', 'mahwari', 'garbh', 'ruthuvu', 'garabham'],
    'child': ['child', 'baby', 'toddler', 'infant', 'kid', 'bachcha', 'bachhe', 'bache', 'pilla', 'pilladu', 'papa', 'bidda'],
}

# Mirrors backend/src/constants/specialties.ts
SPECIALTIES = {
    'D001': {'name': 'General Physician', 'department': 'General Medicine'},
    'D002': {'name': 'Cardiologist', 'department': 'Cardiology'},
    'D003': {'name': 'Orthopedic Specialist', 'department': 'Orthopedics'},
    'D004': {'name': 'Gynecologist', 'department': 'Gynecology'},
    'D005': {'name': 'Neurologist', 'department': 'Neurology'},
    'D006': {'name': 'Dermatologist', 'department': 'Dermatology'},
    'D007': {'name': 'Pediatrician', 'department': 'Pediatrics'},
    'D008': {'name': 'ENT Specialist', 'department': 'ENT'},
    'D009': {'name': 'Pulmonologist', 'department': 'Pulmonology'},
    'D010': {'name': 'Endocrinologist', 'department': 'Endocrinology'},
}

CATEGORY_SPECIALTY_SCORES: dict[str, dict[str, int]] = {
    'fever': {'D001': 8, 'D007': 6, 'D009': 3},
    'stomach': {'D001': 7, 'D004': 5, 'D007': 4, 'D002': 1},
    'chest': {'D002': 12, 'D009': 6, 'D001': 3},
    'breathing': {'D009': 12, 'D002': 5, 'D001': 4},
    'head': {'D005': 10, 'D001': 4},
    'bone': {'D003': 10, 'D001': 3},
    'skin': {'D006': 10, 'D001': 3},
    'ent': {'D008': 10, 'D001': 3},
    'women': {'D004': 10, 'D001': 3},
    'child': {'D007': 10, 'D001': 3},
}


def _option(option_id: str) -> Option:
    return Option(
        id=option_id,
        emoji=lang.t('option_emoji.' + option_id, _fallback=option_id),
        text=lang.t('option_text.' + option_id, _fallback=option_id),
    )


NOT_SURE = _option('not_sure')


def _build_questions() -> dict[str, list[Question]]:
    bank: dict[str, list[Question]] = {}
    for cat in CATEGORIES:
        items = []
        for entry in lang.section('questions').get(cat, []):
            options = [_option(o) for o in entry.get('options', [])]
            options.append(NOT_SURE)
            items.append(
                Question(
                    id=entry['id'],
                    prompt=entry['prompt'],
                    simple_prompt=entry.get('simple', entry['prompt']),
                    options=options,
                )
            )
        bank[cat] = items
    return bank


QUESTIONS = _build_questions()


def detect_categories(texts: list[str]) -> list[str]:
    """Return detected categories in the order they appear in the text."""
    joined = ' ' + ' '.join(texts).lower() + ' '
    hits = []
    for cat in CATEGORIES:
        for kw in KEYWORDS[cat]:
            at = joined.find(' ' + kw)
            if at == -1:
                continue
            after = joined[at + 1 + len(kw)]
            if after and after not in (' ', '.', ',', '?', '!'):
                continue
            hits.append((at, cat))
            break
    hits.sort(key=lambda h: h[0])
    return [cat for _, cat in hits]