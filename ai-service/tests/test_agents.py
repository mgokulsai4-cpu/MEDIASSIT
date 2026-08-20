from app.agents import appointment_agent, queue_agent, report_agent
from app.agents.slot_agent import recommend_slots


def test_appointment_slot_message():
    msg = appointment_agent.available_slots_message(
        ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
        doctor_name='Dr. Kumar',
        date='2026-08-10',
        max_preview=5,
    )
    assert 'Dr. Kumar' in msg
    assert '11:30 AM' in msg  # shown via the "more slots" line
    assert 'Available slots' in msg


def test_appointment_no_slots_message():
    msg = appointment_agent.available_slots_message([])
    assert 'no available slots' in msg


def test_appointment_confirmation_message():
    msg = appointment_agent.confirmation_message('Dr. Kumar', '2026-08-10', '09:00 AM')
    assert 'Dr. Kumar' in msg
    assert '2026-08-10' in msg
    assert '09:00 AM' in msg


def test_queue_estimate_wait():
    est = queue_agent.estimate_wait(position=3, avg_minutes=15)
    assert est['position'] == 3
    assert est['estimated_minutes'] == 30
    assert '30' in est['message']
    assert queue_agent.estimate_wait(position=0, avg_minutes=15)['estimated_minutes'] == 0


def test_queue_status_messages():
    assert 'calling' in queue_agent.status_message('called').lower()
    assert queue_agent.status_message('completed')
    assert queue_agent.status_message('unknown_status')  # never raises


def test_report_parser_extracts_sections():
    text = (
        'Symptoms: Cough\n'
        'Clinical Observations: Mild wheezing\n'
        'Diagnosis: Asthma\n'
        'Treatment: Inhaler\n'
        'Follow-up: 2 weeks\n'
    )
    result = report_agent.summarize_report(text, diagnosis='Asthma')
    summary = result['ai_summary']
    assert summary['main_complaint'] == 'Cough'
    assert summary['findings'] == 'Mild wheezing'
    assert summary['diagnosis'] == 'Asthma'
    assert summary['treatment'] == 'Inhaler'
    assert summary['follow_up'] == '2 weeks'


def test_slot_recommendation_prefers_shorter_wait():
    recs = recommend_slots([
        {'doctor_id': 'D2', 'doctor_name': 'Slow', 'specialization': 'GP', 'date': '2026-08-14', 'time': '09:00 AM', 'estimated_wait_minutes': 45, 'rating': 4.2, 'experience_years': 8},
        {'doctor_id': 'D1', 'doctor_name': 'Fast', 'specialization': 'GP', 'date': '2026-08-14', 'time': '09:30 AM', 'estimated_wait_minutes': 5, 'rating': 4.2, 'experience_years': 8},
    ], urgency='green')
    assert recs[0]['doctor_id'] == 'D1'
    assert recs[0]['estimated_wait_minutes'] == 5


def test_slot_recommendation_prefers_experience_and_rating_when_wait_is_similar():
    recs = recommend_slots([
        {'doctor_id': 'D2', 'doctor_name': 'Junior', 'specialization': 'GP', 'date': '2026-08-14', 'time': '09:00 AM', 'estimated_wait_minutes': 10, 'rating': 3.8, 'experience_years': 2},
        {'doctor_id': 'D1', 'doctor_name': 'Senior', 'specialization': 'GP', 'date': '2026-08-14', 'time': '09:30 AM', 'estimated_wait_minutes': 12, 'rating': 4.9, 'experience_years': 18},
    ], urgency='green')
    assert recs[0]['doctor_id'] == 'D1'


def test_slot_recommendation_urgent_prefers_earlier_slot():
    recs = recommend_slots([
        {'doctor_id': 'D1', 'doctor_name': 'Later', 'specialization': 'GP', 'date': '2026-08-16', 'time': '09:00 AM', 'estimated_wait_minutes': 0},
        {'doctor_id': 'D1', 'doctor_name': 'Sooner', 'specialization': 'GP', 'date': '2026-08-14', 'time': '02:00 PM', 'estimated_wait_minutes': 10},
    ], urgency='red')
    assert recs[0]['date'] == '2026-08-14'