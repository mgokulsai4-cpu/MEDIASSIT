from app.agents.preconsult_agent.agent import (
    classify_complaint,
    compute_urgency,
    next_turn,
    seed_answers_from_context,
)


def _answer(key: str, value: str) -> dict:
    return {'key': key, 'answer': value, 'rephrased': False}


def test_welcome_only_when_interview_has_not_started():
    first = next_turn([], [])
    assert first['type'] == 'question'
    assert first['question']['id'] == 'welcome'

    second = next_turn([], [_answer('start', 'start')])
    assert second['question']['id'] == 'chief_complaint'
    assert second['question']['id'] != 'welcome'


def test_fever_complaint_asks_adaptive_fever_question():
    turn = next_turn(
        [{'role': 'patient', 'text': 'I have a high fever'}],
        [_answer('start', 'start'), _answer('chief_complaint', 'I have a high fever')],
    )
    assert turn['question']['id'] == 'adaptive_fever'


def test_skips_allergies_when_profile_already_has_them():
    answers = [
        _answer('start', 'start'),
        _answer('chief_complaint', 'Sore throat'),
        _answer('adaptive_general', 'nothing'),
        _answer('symptoms_duration', '1_to_3_days'),
        _answer('symptoms_severity', 'mild'),
        _answer('medications_current', 'none'),
    ]
    turn = next_turn(
        [{'role': 'patient', 'text': 'Sore throat'}],
        answers,
        patient_context={'allergies': ['Penicillin'], 'existing_conditions': ['Asthma']},
    )
    assert turn['question']['id'] not in ('allergies', 'allergies_list', 'history_conditions')
    assert turn['question']['id'] == 'lifestyle'


def test_summary_includes_complaint_urgency_and_clinical_text():
    answers = [
        _answer('start', 'start'),
        _answer('chief_complaint', 'Chest pain when walking'),
        _answer('adaptive_chest', 'sob'),
        _answer('symptoms_duration', 'less_than_day'),
        _answer('symptoms_severity', 'severe'),
        _answer('medications_current', 'none'),
        _answer('allergies', 'none'),
        _answer('history_conditions', 'none'),
        _answer('lifestyle', 'none'),
        _answer('vitals_temp', 'normal'),
        _answer('confirm_done', 'done'),
    ]
    result = next_turn(
        [{'role': 'patient', 'text': 'Chest pain when walking'}],
        answers,
    )
    assert result['type'] == 'result'
    summary = result['preconsult_summary']
    assert summary['chief_complaint'] == 'Chest pain when walking'
    assert summary['urgency'] == 'red'
    assert 'Chest pain' in summary['clinical_summary']
    assert summary['symptoms'][0]['severity'] == 'severe'


def test_seed_answers_from_known_profile():
    seeded = seed_answers_from_context([], {
        'allergies': ['Dust'],
        'existing_conditions': ['Asthma'],
    })
    keys = {item['key'] for item in seeded}
    assert 'allergies' in keys
    assert 'allergies_list' in keys
    assert 'history_conditions_list' in keys


def test_http_preconsult_welcome(client):
    res = client.post('/ai/preconsult', json={'messages': [], 'answers': []})
    assert res.status_code == 200
    assert res.json()['question']['id'] == 'welcome'


def test_classify_and_urgency_helpers():
    assert classify_complaint('high fever and chills') == 'fever'
    assert compute_urgency(
        [_answer('symptoms_severity', 'mild'), _answer('chief_complaint', 'routine checkup')],
        [{'role': 'patient', 'text': 'routine checkup'}],
    ) == 'green'
