REPORT_TEXT = (
    'Symptoms: Knee pain, Swelling\n'
    'Clinical Observations: Tenderness and mild swelling over the right knee.\n'
    'Diagnosis: Right knee sprain (Grade 1)\n'
    'Treatment: Rest, ice pack, compression bandage.\n'
    'Prescription: Paracetamol 500mg as needed\n'
    'Follow-up: Review in 1 week or earlier if pain increases.'
)


def test_summarize_extractive(client):
    res = client.post('/summarize', json={'text': REPORT_TEXT, 'diagnosis': 'Right knee sprain (Grade 1)'})
    assert res.status_code == 200
    data = res.json()
    assert data['model_used']
    summary = data['ai_summary']
    assert isinstance(summary, dict)
    assert 'sprain' in summary['diagnosis']
    assert 'Rest' in summary['treatment']
    assert '1 week' in summary['follow_up']


def test_summarize_missing_sections_stays_empty_but_valid(client):
    res = client.post('/summarize', json={'text': 'unstructured notes only', 'diagnosis': ''})
    assert res.status_code == 200
    data = res.json()
    assert set(data['ai_summary'].keys()) == {'main_complaint', 'findings', 'diagnosis', 'treatment', 'follow_up'}