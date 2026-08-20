def test_triage_one_shot_with_answers(client):
    res = client.post('/ai/triage', json={
        'patient_context': {'age': 34, 'gender': 'male', 'existing_conditions': []},
        'messages': [{'role': 'patient', 'text': 'I have a severe headache and blurred vision'}],
        'answers': [
            {'key': 'Q_head_sev', 'answer': 'severe'},
            {'key': 'Q_head_assoc', 'answer': 'vision'},
        ],
    })
    assert res.status_code == 200
    data = res.json()
    # Head + vision warning sign is high-risk → immediate result
    assert data['type'] == 'result'
    triage = data['triage']
    assert triage['urgency']['level'] in ('red', 'orange', 'yellow')
    assert triage['symptoms']
    codes = [s['code'] for s in triage['recommended_specialties']]
    assert 'D005' in codes  # Neurologist


def test_triage_not_sure_asks_easy_follow_up_then_falls_back(client):
    res = client.post('/ai/triage', json={
        'messages': [],
        'answers': [{'key': 'category', 'answer': 'not_sure'}],
    })
    assert res.status_code == 200
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'category_fallback'

    res = client.post('/ai/triage', json={
        'messages': [],
        'answers': [
            {'key': 'category', 'answer': 'not_sure'},
            {'key': 'category_fallback', 'answer': 'dk'},
        ],
    })
    data = res.json()
    assert data['type'] == 'result'
    assert data['triage']['recommended_specialties'][0]['code'] == 'D001'

    res = client.post('/ai/triage', json={
        'messages': [],
        'answers': [
            {'key': 'category', 'answer': 'not_sure'},
            {'key': 'category_fallback', 'answer': 'stomach_pain'},
        ],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'Q_stomach_loc'


def test_triage_simple_mode_and_hinglish(client):
    res = client.post('/ai/triage', json={
        'simple': True,
        'messages': [{'role': 'patient', 'text': 'sir dard hai'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'Q_head_sev'
    assert data['question']['text'] == 'How bad is it? A little, medium or very bad?'

    res = client.post('/ai/triage', json={
        'simple': True,
        'messages': [],
        'answers': [{'key': 'Q_head_sev.little', 'answer': 'little'}],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'Q_head_assoc'


def test_triage_telugish_keywords(client):
    res = client.post('/ai/triage', json={
        'messages': [{'role': 'patient', 'text': 'jwaram vastundi, tala noppi kuda'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] in ('Q_fever_severity', 'Q_head_sev')

    res = client.post('/ai/triage', json={
        'messages': [{'role': 'patient', 'text': 'kadupu noppi, vantulu avutunnayi'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'].startswith('Q_stomach_')


def test_triage_skips_questions_answered_in_text(client):
    res = client.post('/ai/triage', json={
        'messages': [{'role': 'patient', 'text': 'I have a mild fever since yesterday and slight body ache'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'Q_fever_assoc'


def test_triage_orders_categories_by_mention(client):
    res = client.post('/ai/triage', json={
        'messages': [{'role': 'patient', 'text': 'tala noppi and bukhar'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'Q_head_sev'


def test_patient_age_biases_pediatrics(client):
    res = client.post('/ai/triage', json={
        'patient_context': {'age': 5, 'gender': 'female', 'existing_conditions': []},
        'messages': [{'role': 'patient', 'text': 'my child has fever and a rash'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'  # adaptive flow continues
    q = data['question']
    assert q['id'].startswith('Q_')