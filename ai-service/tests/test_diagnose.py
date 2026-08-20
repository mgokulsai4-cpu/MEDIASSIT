from app.agents.diagnosis_agent import assist_diagnosis


def test_routine_fever_gets_draft_prescription():
    result = assist_diagnosis({
        'preconsult_summary': {
            'chief_complaint': 'Fever and cough for two days',
            'symptoms': [{'duration': '1–3 days', 'severity': 'mild', 'associated': 'Just the fever'}],
            'urgency': 'green',
        },
        'patient': {'age': 28, 'gender': 'female', 'allergies': []},
    })
    assert result['difficulty'] == 'routine'
    assert result['prescription']
    assert result['diagnoses']


def test_chest_pain_is_complex_without_auto_prescription():
    result = assist_diagnosis({
        'preconsult_summary': {
            'chief_complaint': 'Chest pain spreading to the arm',
            'symptoms': [{'duration': 'Less than a day', 'severity': 'severe', 'associated': 'It spreads to arm, jaw, or back'}],
            'urgency': 'red',
        },
        'patient': {'age': 54, 'gender': 'male'},
    })
    assert result['difficulty'] == 'complex'
    assert result['prescription'] == []
    assert result['red_flags']
