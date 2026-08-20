"""Doctor diagnostic assistance — routine cases get a draft plan; hard cases stay assist-only."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

DISCLAIMER = (
    'Decision support only. Confirm the history, examine the patient, and apply clinical judgment '
    'before diagnosing or prescribing. This is not a substitute for a licensed clinician.'
)


def _text(summary: dict, extra: dict) -> str:
    parts = [
        str(summary.get('chief_complaint') or ''),
        str(extra.get('reason') or ''),
        str(summary.get('clinical_summary') or ''),
    ]
    for item in summary.get('symptoms') or []:
        if isinstance(item, dict):
            parts.append(str(item.get('associated') or ''))
            parts.append(str(item.get('severity') or ''))
    return ' '.join(parts).lower()


def _severity(summary: dict) -> str:
    symptoms = summary.get('symptoms') or []
    if symptoms and isinstance(symptoms[0], dict):
        return str(symptoms[0].get('severity') or '').lower()
    return ''


def _allergies(summary: dict, patient: dict) -> list[str]:
    values = []
    for source in (summary.get('allergies') or [], patient.get('allergies') or []):
        for item in source:
            text = str(item).strip()
            if text and text.lower() not in ('none', 'none reported'):
                values.append(text)
    return values


def _is_complex(text: str, urgency: str, severity: str) -> bool:
    if urgency in ('red', 'orange'):
        return True
    if severity in ('severe', 'very severe', 'very_severe'):
        return True
    flags = (
        'chest', 'heart', 'radiat', 'breath', 'shortness', 'unconscious', 'seizure',
        'stroke', 'bleeding', 'pregnant', 'suicide', 'overdose', 'anaphyla',
    )
    return any(flag in text for flag in flags)


def _routine_pack(text: str) -> tuple[list[dict], list[dict], list[str]]:
    diagnoses: list[dict] = []
    prescription: list[dict] = []
    points: list[str] = []

    if any(word in text for word in ('fever', 'cough', 'cold', 'sore throat', 'flu')):
        diagnoses.append({
            'name': 'Likely viral upper respiratory infection',
            'confidence': 0.64,
            'rationale': 'Fever or cough without emergency features is often a short viral illness.',
        })
        prescription.append({
            'drug': 'Paracetamol',
            'dose': '500 mg every 6–8 hours as needed',
            'notes': 'Do not exceed 3 g/day. Recheck if fever lasts more than 3 days.',
        })
        points.append('Ask about duration, sputum, and sick contacts.')
    elif any(word in text for word in ('headache', 'migraine')):
        diagnoses.append({
            'name': 'Primary headache, possibly tension-type',
            'confidence': 0.55,
            'rationale': 'Isolated headache without neurological red flags is often primary.',
        })
        prescription.append({
            'drug': 'Paracetamol or ibuprofen',
            'dose': 'Standard adult analgesic dose with food if using ibuprofen',
            'notes': 'Avoid if ulcer, kidney disease, or anticoagulant use. Refer if sudden worst-ever headache.',
        })
        points.append('Screen for sudden onset, neck stiffness, vision change, or weakness.')
    elif any(word in text for word in ('stomach', 'nause', 'vomit', 'diarrhea', 'diarrho', 'abdomen')):
        diagnoses.append({
            'name': 'Acute gastroenteritis',
            'confidence': 0.58,
            'rationale': 'Short-lived gut symptoms without bleeding often settle with fluids.',
        })
        prescription.append({
            'drug': 'Oral rehydration solution',
            'dose': 'Frequent small sips',
            'notes': 'Seek care again for blood in stool, persistent vomiting, or signs of dehydration.',
        })
        points.append('Check hydration and recent food or travel exposure.')
    elif any(word in text for word in ('rash', 'itch', 'allerg')):
        diagnoses.append({
            'name': 'Allergic or irritant skin reaction',
            'confidence': 0.5,
            'rationale': 'Itch or rash without airway symptoms is commonly a local reaction.',
        })
        prescription.append({
            'drug': 'Cetirizine',
            'dose': '10 mg once daily',
            'notes': 'Stop any newly started trigger if identified. Escalate if swelling or breathing trouble.',
        })
    else:
        diagnoses.append({
            'name': 'Symptom-directed working impression',
            'confidence': 0.35,
            'rationale': 'Not enough specific features for a confident single diagnosis.',
        })
        points.append('Clarify onset, location, and what makes it better or worse.')

    return diagnoses, prescription, points


def _complex_pack(text: str) -> tuple[list[dict], list[str], list[str]]:
    diagnoses: list[dict] = []
    points = [
        'Take a focused history and vital signs before committing to a diagnosis.',
        'Look for red-flag progression since the pre-consultation answers.',
    ]
    red_flags: list[str] = []

    if any(word in text for word in ('chest', 'heart', 'radiat', 'jaw', 'left arm')):
        diagnoses.extend([
            {'name': 'Acute coronary syndrome — must rule out', 'confidence': 0.42, 'rationale': 'Chest discomfort with radiation or breathlessness can be cardiac.'},
            {'name': 'Musculoskeletal or reflux chest pain', 'confidence': 0.28, 'rationale': 'Consider after life-threatening causes are excluded.'},
        ])
        red_flags.append('Chest pain with radiation, sweating, or breathlessness needs urgent evaluation.')
        points.append('ECG, vitals, and immediate emergency pathway if unstable.')
    elif any(word in text for word in ('breath', 'wheez', 'asthma', 'shortness')):
        diagnoses.extend([
            {'name': 'Acute asthma or reactive airway exacerbation', 'confidence': 0.48, 'rationale': 'Exertional or nocturnal breathlessness with a respiratory history.'},
            {'name': 'Cardiac or infectious cause of dyspnea', 'confidence': 0.3, 'rationale': 'Keep broader until exam and saturation are known.'},
        ])
        red_flags.append('Resting breathlessness, low saturation, or inability to speak full sentences is urgent.')
        points.append('Check oxygen saturation, respiratory rate, and work of breathing.')
    else:
        diagnoses.append({
            'name': 'Undifferentiated high-risk presentation',
            'confidence': 0.3,
            'rationale': 'Severity or red-flag language means the case should stay open.',
        })
        red_flags.append('Do not auto-prescribe until examination and safety-netting are complete.')

    return diagnoses, points, red_flags


def _offline_assist(payload: dict[str, Any]) -> dict:
    summary = payload.get('preconsult_summary') or {}
    patient = payload.get('patient') or {}
    extra = {'reason': payload.get('reason') or ''}
    text = _text(summary, extra)
    urgency = str(summary.get('urgency') or payload.get('urgency') or 'green').lower()
    severity = _severity(summary)
    complex_case = _is_complex(text, urgency, severity)

    if complex_case:
        diagnoses, assist_points, red_flags = _complex_pack(text)
        prescription: list[dict] = []
        difficulty = 'complex'
        reasoning = (
            'Pre-consultation severity or red-flag symptoms make this a hard case. '
            'AI is assisting with differentials, not writing a prescription.'
        )
    else:
        diagnoses, prescription, assist_points = _routine_pack(text)
        red_flags = []
        difficulty = 'routine'
        reasoning = (
            'The pre-consultation answers look like a common, lower-risk presentation. '
            'A draft supportive plan is offered for the doctor to accept or change.'
        )

    allergies = _allergies(summary, patient)
    if allergies and prescription:
        assist_points.append('Review allergies before any medicine: ' + ', '.join(allergies) + '.')

    return {
        'difficulty': difficulty,
        'diagnoses': diagnoses,
        'prescription': prescription,
        'assist_points': assist_points,
        'red_flags': red_flags,
        'reasoning': reasoning,
        'disclaimer': DISCLAIMER,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'model_used': 'offline-diagnosis-v1',
    }


def _llm_assist(payload: dict[str, Any], baseline: dict) -> dict | None:
    try:
        from ...services.llm import chat_completion, is_configured
        if not is_configured():
            return None
        raw = chat_completion(
            system=(
                'You assist a licensed doctor. Return JSON only with keys: difficulty '
                '(routine|complex), diagnoses (list of {name, confidence, rationale}), '
                'prescription (list of {drug, dose, notes} — empty if complex), assist_points, '
                'red_flags, reasoning. Do not invent labs. Keep prescriptions conservative and OTC/supportive.'
            ),
            user=json.dumps({
                'patient': payload.get('patient') or {},
                'preconsult_summary': payload.get('preconsult_summary') or {},
                'notes': payload.get('notes') or [],
                'reason': payload.get('reason') or '',
                'baseline': baseline,
            }, default=str),
            temperature=0.1,
            max_tokens=500,
        )
        start, end = raw.find('{'), raw.rfind('}')
        if start < 0 or end <= start:
            return None
        data = json.loads(raw[start:end + 1])
        if not isinstance(data, dict) or not data.get('diagnoses'):
            return None
        merged = dict(baseline)
        for key in ('difficulty', 'diagnoses', 'prescription', 'assist_points', 'red_flags', 'reasoning'):
            if data.get(key) is not None:
                merged[key] = data[key]
        if merged.get('difficulty') == 'complex':
            merged['prescription'] = []
        merged['model_used'] = 'llm-diagnosis'
        return merged
    except Exception:
        return None


def assist_diagnosis(payload: dict[str, Any] | None = None) -> dict:
    payload = payload or {}
    baseline = _offline_assist(payload)
    return _llm_assist(payload, baseline) or baseline
