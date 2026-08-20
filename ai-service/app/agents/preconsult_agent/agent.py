"""Pre-consultation interview engine — collects structured patient info before doctor consultation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from .types import NOT_SURE, Option, Question

WELCOME_MESSAGE = (
    "Welcome to your pre-consultation interview. "
    "I'll ask you a few questions to help your doctor prepare for your visit. "
    "This should only take a couple of minutes."
)

QUESTIONS = {
    'chief_complaint': Question(
        id='chief_complaint',
        prompt='What is the main reason for your visit today? Please describe briefly.',
        simple_prompt='What brings you in today?',
        options=[
            Option(id='free_text', emoji='', text='Type your answer'),
        ],
    ),
    'adaptive_fever': Question(
        id='adaptive_fever',
        prompt='Along with the fever, have you had any of these?',
        simple_prompt='Any other symptoms with the fever?',
        options=[
            Option(id='chills', emoji='', text='Chills or shivering'),
            Option(id='body_ache', emoji='', text='Body ache'),
            Option(id='cough', emoji='', text='Cough or sore throat'),
            Option(id='none', emoji='', text='Just the fever'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'adaptive_chest': Question(
        id='adaptive_chest',
        prompt='Does the chest discomfort spread anywhere, or come with shortness of breath?',
        simple_prompt='Does it spread or affect your breathing?',
        options=[
            Option(id='radiates', emoji='', text='It spreads to arm, jaw, or back'),
            Option(id='sob', emoji='', text='Shortness of breath'),
            Option(id='both', emoji='', text='Both'),
            Option(id='neither', emoji='', text='Neither'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'adaptive_breathing': Question(
        id='adaptive_breathing',
        prompt='When is the breathing problem worst?',
        simple_prompt='When is breathing hardest?',
        options=[
            Option(id='rest', emoji='', text='At rest'),
            Option(id='exertion', emoji='', text='When I walk or exercise'),
            Option(id='night', emoji='', text='At night or when lying down'),
            Option(id='all', emoji='', text='Most of the time'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'adaptive_stomach': Question(
        id='adaptive_stomach',
        prompt='Have you also had vomiting, diarrhea, or both?',
        simple_prompt='Any vomiting or diarrhea?',
        options=[
            Option(id='vomiting', emoji='', text='Vomiting'),
            Option(id='diarrhea', emoji='', text='Diarrhea'),
            Option(id='both', emoji='', text='Both'),
            Option(id='neither', emoji='', text='Neither'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'adaptive_pain': Question(
        id='adaptive_pain',
        prompt='What makes the pain worse?',
        simple_prompt='What makes the pain worse?',
        options=[
            Option(id='movement', emoji='', text='Movement'),
            Option(id='touch', emoji='', text='Touch or pressure'),
            Option(id='rest', emoji='', text='It hurts even at rest'),
            Option(id='nothing', emoji='', text='Nothing in particular'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'adaptive_injury': Question(
        id='adaptive_injury',
        prompt='How did the injury happen?',
        simple_prompt='How did you get hurt?',
        options=[
            Option(id='fall', emoji='', text='A fall'),
            Option(id='sports', emoji='', text='Sports or exercise'),
            Option(id='accident', emoji='', text='Accident or impact'),
            Option(id='unknown', emoji='', text='I am not sure'),
        ],
    ),
    'adaptive_general': Question(
        id='adaptive_general',
        prompt='Is anything making the symptoms worse?',
        simple_prompt='What makes it worse?',
        options=[
            Option(id='activity', emoji='', text='Activity or movement'),
            Option(id='food', emoji='', text='Food or drink'),
            Option(id='night', emoji='', text='Night time'),
            Option(id='nothing', emoji='', text='Nothing specific'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'symptoms_duration': Question(
        id='symptoms_duration',
        prompt='How long have you been experiencing these symptoms?',
        simple_prompt='How long has this been going on?',
        options=[
            Option(id='less_than_day', emoji='', text='Less than a day'),
            Option(id='1_to_3_days', emoji='', text='1–3 days'),
            Option(id='4_to_7_days', emoji='', text='4–7 days'),
            Option(id='1_to_4_weeks', emoji='', text='1–4 weeks'),
            Option(id='more_than_month', emoji='', text='More than a month'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'symptoms_severity': Question(
        id='symptoms_severity',
        prompt='How would you rate the severity of your symptoms?',
        simple_prompt='How bad are your symptoms?',
        options=[
            Option(id='mild', emoji='', text='Mild — noticeable but not interfering'),
            Option(id='moderate', emoji='', text='Moderate — somewhat interfering'),
            Option(id='severe', emoji='', text='Severe — significantly affecting daily life'),
            Option(id='very_severe', emoji='', text='Very severe — unable to function normally'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'medications_current': Question(
        id='medications_current',
        prompt='Are you currently taking any medications (prescription or over-the-counter)?',
        simple_prompt='Are you on any medications?',
        options=[
            Option(id='yes_list', emoji='', text='Yes — I will list them'),
            Option(id='none', emoji='', text='None'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'medications_list': Question(
        id='medications_list',
        prompt='Please list your current medications, including dosage if you know it.',
        simple_prompt='What medications are you taking?',
        options=[
            Option(id='free_text', emoji='', text='Type your medications'),
        ],
    ),
    'allergies': Question(
        id='allergies',
        prompt='Do you have any known allergies (medications, food, latex, etc.)?',
        simple_prompt='Do you have any allergies?',
        options=[
            Option(id='yes_list', emoji='', text='Yes — I will list them'),
            Option(id='none', emoji='', text='None'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'allergies_list': Question(
        id='allergies_list',
        prompt='Please list your allergies.',
        simple_prompt='What are you allergic to?',
        options=[
            Option(id='free_text', emoji='', text='Type your allergies'),
        ],
    ),
    'history_conditions': Question(
        id='history_conditions',
        prompt='Do you have any chronic medical conditions (e.g., diabetes, hypertension, asthma)?',
        simple_prompt='Do you have any ongoing health conditions?',
        options=[
            Option(id='yes_list', emoji='', text='Yes — I will list them'),
            Option(id='none', emoji='', text='None'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'history_conditions_list': Question(
        id='history_conditions_list',
        prompt='Please list your chronic conditions or past major illnesses/surgeries.',
        simple_prompt='What ongoing conditions or past surgeries do you have?',
        options=[
            Option(id='free_text', emoji='', text='Type your history'),
        ],
    ),
    'lifestyle': Question(
        id='lifestyle',
        prompt='Do you smoke, drink alcohol, or use any recreational substances? (This helps the doctor understand your overall health.)',
        simple_prompt='Do you smoke or drink?',
        options=[
            Option(id='smoking', emoji='', text='Smoking'),
            Option(id='alcohol', emoji='', text='Alcohol consumption'),
            Option(id='both', emoji='', text='Both smoking and alcohol'),
            Option(id='none', emoji='', text='Neither'),
            Option(id='prefer_not', emoji='', text='Prefer not to say'),
        ],
    ),
    'vitals_temp': Question(
        id='vitals_temp',
        prompt='Do you know your current body temperature? If you have a thermometer at home.',
        simple_prompt='Do you have a fever? Do you know your temperature?',
        options=[
            Option(id='normal', emoji='', text='Normal (below 37.5°C / 99.5°F)'),
            Option(id='mild_fever', emoji='', text='Mild fever (37.5–38.5°C / 99.5–101.3°F)'),
            Option(id='high_fever', emoji='', text='High fever (above 38.5°C / 101.3°F)'),
            Option(id='unknown', emoji='', text='I don\'t know'),
        ],
    ),
    'confirm_done': Question(
        id='confirm_done',
        prompt='Thank you. I have collected all the information I need. Is there anything else you would like to add before I generate the summary?',
        simple_prompt='Anything else you want to mention?',
        options=[
            Option(id='add_more', emoji='', text='Yes, I want to add something'),
            Option(id='done', emoji='', text='No, I am done'),
        ],
    ),
}

ADAPTIVE_KEYS = {
    'fever': 'adaptive_fever',
    'chest': 'adaptive_chest',
    'breathing': 'adaptive_breathing',
    'stomach': 'adaptive_stomach',
    'pain': 'adaptive_pain',
    'injury': 'adaptive_injury',
    'general': 'adaptive_general',
}

TOPIC_QUESTIONS = {
    'chief_complaint': ['chief_complaint'],
    'adaptive': list(ADAPTIVE_KEYS.values()),
    'symptoms': ['symptoms_duration', 'symptoms_severity'],
    'medications': ['medications_current', 'medications_list'],
    'allergies': ['allergies', 'allergies_list'],
    'history': ['history_conditions', 'history_conditions_list'],
    'lifestyle': ['lifestyle'],
    'vitals': ['vitals_temp'],
}

TOPIC_ORDER = [
    'chief_complaint',
    'adaptive',
    'symptoms',
    'medications',
    'allergies',
    'history',
    'lifestyle',
    'vitals',
]

DURATION_LABELS = {
    'less_than_day': 'Less than a day',
    '1_to_3_days': '1–3 days',
    '4_to_7_days': '4–7 days',
    '1_to_4_weeks': '1–4 weeks',
    'more_than_month': 'More than a month',
}

SEVERITY_LABELS = {
    'mild': 'mild',
    'moderate': 'moderate',
    'severe': 'severe',
    'very_severe': 'very severe',
}

LIFESTYLE_LABELS = {
    'smoking': 'Smoking',
    'alcohol': 'Alcohol consumption',
    'both': 'Both smoking and alcohol',
    'none': 'None reported',
    'prefer_not': 'Prefer not to say',
}

TEMP_LABELS = {
    'normal': 'Normal (below 37.5°C)',
    'mild_fever': 'Mild fever (37.5–38.5°C)',
    'high_fever': 'High fever (above 38.5°C)',
    'unknown': 'Unknown',
}

URGENCY_RANK = {'green': 1, 'yellow': 2, 'orange': 3, 'red': 4}
START_TEXTS = {"let's begin", 'lets begin', 'start'}


def _answer_map(answers: list[dict]) -> dict[str, str]:
    return {str(a.get('key')): str(a.get('answer', '')) for a in answers if a.get('key')}


def _answer_value(answers: list[dict], key: str) -> Optional[str]:
    for item in answers:
        if item.get('key') == key:
            return str(item.get('answer', ''))
    return None


def _option_text(question_id: str, option_id: str) -> str:
    question = QUESTIONS.get(question_id)
    if not question:
        return option_id
    for option in question.options:
        if option.id == option_id:
            return option.text
    return option_id


def classify_complaint(text: str) -> str:
    lowered = (text or '').lower()
    if any(word in lowered for word in ('chest', 'heart', 'palpitat')):
        return 'chest'
    if any(word in lowered for word in ('breath', 'wheez', 'cough', 'asthma', 'shortness')):
        return 'breathing'
    if any(word in lowered for word in ('fever', 'temperature', 'chills')):
        return 'fever'
    if any(word in lowered for word in ('stomach', 'nause', 'vomit', 'diarrho', 'diarrhea', 'abdomen')):
        return 'stomach'
    if any(word in lowered for word in ('injur', 'fall', 'fracture', 'wound', 'cut', 'accident', 'sprain')):
        return 'injury'
    if any(word in lowered for word in ('pain', 'ache', 'hurt')):
        return 'pain'
    return 'general'


def _is_start_text(text: str) -> bool:
    return str(text or '').strip().lower() in START_TEXTS


def _patient_texts(messages: list[dict]) -> list[str]:
    texts = []
    for message in messages:
        if message.get('role') != 'patient':
            continue
        text = str(message.get('text', '')).strip()
        if text and not _is_start_text(text):
            texts.append(text)
    return texts


def _chief_complaint_text(answers: list[dict], messages: list[dict]) -> str:
    mapped = _answer_map(answers)
    complaint = mapped.get('chief_complaint', '').strip()
    if complaint and complaint not in ('free_text', 'start') and not _is_start_text(complaint):
        return complaint
    if _patient_texts(messages):
        return _patient_texts(messages)[0]
    followup = mapped.get('chief_complaint_followup', '').strip()
    return followup


def _known_allergies(patient_context: Optional[dict]) -> list[str]:
    raw = (patient_context or {}).get('allergies') or []
    return [str(item).strip() for item in raw if str(item).strip()]


def _known_conditions(patient_context: Optional[dict]) -> list[str]:
    raw = (patient_context or {}).get('existing_conditions') or []
    return [str(item).strip() for item in raw if str(item).strip()]


def seed_answers_from_context(answers: list[dict], patient_context: Optional[dict]) -> list[dict]:
    """Skip topics already known from the patient profile."""
    seeded = list(answers)
    keys = {item.get('key') for item in seeded}

    allergies = _known_allergies(patient_context)
    if allergies and 'allergies' not in keys:
        seeded.append({'key': 'allergies', 'answer': 'yes_list', 'rephrased': False})
        seeded.append({'key': 'allergies_list', 'answer': ', '.join(allergies), 'rephrased': False})

    conditions = _known_conditions(patient_context)
    if conditions and 'history_conditions' not in keys:
        seeded.append({'key': 'history_conditions', 'answer': 'yes_list', 'rephrased': False})
        seeded.append({'key': 'history_conditions_list', 'answer': ', '.join(conditions), 'rephrased': False})

    return seeded


def _adaptive_question_id(answers: list[dict], messages: list[dict]) -> str:
    return ADAPTIVE_KEYS[classify_complaint(_chief_complaint_text(answers, messages))]


def _next_unanswered_topic(answers: list[dict], messages: list[dict]) -> Optional[str]:
    answered = {item.get('key') for item in answers}
    for topic in TOPIC_ORDER:
        if topic == 'adaptive':
            qid = _adaptive_question_id(answers, messages)
            if qid not in answered:
                return topic
            continue

        required = TOPIC_QUESTIONS[topic]
        core_done = all(
            key in answered
            for key in required
            if key not in ('medications_list', 'allergies_list', 'history_conditions_list')
        )
        if not core_done:
            return topic
        if topic == 'medications' and answered_needs_list(answers, 'medications_current', 'medications_list'):
            return topic
        if topic == 'allergies' and answered_needs_list(answers, 'allergies', 'allergies_list'):
            return topic
        if topic == 'history' and answered_needs_list(answers, 'history_conditions', 'history_conditions_list'):
            return topic
    return None


def answered_needs_list(answers: list[dict], flag_key: str, list_key: str) -> bool:
    answered = {item.get('key') for item in answers}
    if flag_key in answered and list_key not in answered:
        return _answer_value(answers, flag_key) == 'yes_list'
    return False


def _next_question_for_topic(topic: str, answers: list[dict], messages: list[dict]) -> Optional[Question]:
    answered = {item.get('key') for item in answers}
    if topic == 'adaptive':
        qid = _adaptive_question_id(answers, messages)
        return None if qid in answered else QUESTIONS.get(qid)

    for qid in TOPIC_QUESTIONS[topic]:
        if qid in answered:
            continue
        if qid == 'medications_list' and _answer_value(answers, 'medications_current') != 'yes_list':
            continue
        if qid == 'allergies_list' and _answer_value(answers, 'allergies') != 'yes_list':
            continue
        if qid == 'history_conditions_list' and _answer_value(answers, 'history_conditions') != 'yes_list':
            continue
        return QUESTIONS.get(qid)
    return None


def compute_urgency(answers: list[dict], messages: list[dict], triage_context: Optional[dict] = None) -> str:
    level = 'green'
    severity = _answer_value(answers, 'symptoms_severity')
    temp = _answer_value(answers, 'vitals_temp')
    category = classify_complaint(_chief_complaint_text(answers, messages))
    adaptive = _answer_value(answers, _adaptive_question_id(answers, messages))

    if severity == 'very_severe':
        level = 'orange'
    elif severity == 'severe':
        level = 'yellow'

    if temp == 'high_fever' and URGENCY_RANK[level] < 3:
        level = 'orange'

    if category in ('chest', 'breathing') and severity in ('severe', 'very_severe'):
        level = 'red'
    if category == 'chest' and adaptive in ('radiates', 'both', 'sob'):
        level = 'red' if severity in ('severe', 'very_severe', 'moderate') else max(level, 'orange', key=lambda item: URGENCY_RANK[item])

    triage_level = ''
    if isinstance(triage_context, dict):
        urgency = triage_context.get('urgency')
        if isinstance(urgency, dict):
            triage_level = str(urgency.get('level') or '')
        elif isinstance(urgency, str):
            triage_level = urgency
        elif triage_context.get('level'):
            triage_level = str(triage_context.get('level'))
    if triage_level in URGENCY_RANK and URGENCY_RANK[triage_level] > URGENCY_RANK[level]:
        level = triage_level
    return level


def build_clinical_summary(summary: dict, patient_context: Optional[dict] = None) -> str:
    patient = patient_context or {}
    who = 'Patient'
    bits = []
    if patient.get('age'):
        bits.append(f"{patient['age']}-year-old")
    if patient.get('gender'):
        bits.append(str(patient['gender']))
    if bits:
        who = ' '.join(bits) + ' patient'

    complaint = summary.get('chief_complaint') or 'an unspecified concern'
    symptoms = summary.get('symptoms') or []
    duration = symptoms[0].get('duration') if symptoms else 'an unspecified duration'
    severity = symptoms[0].get('severity') if symptoms else 'unspecified severity'
    associated = symptoms[0].get('associated') if symptoms else ''

    lines = [
        f"{who.capitalize()} presents with {complaint}. "
        f"Symptoms have lasted {duration} and are described as {severity}."
    ]
    if associated:
        lines.append(f"Associated details: {associated}.")
    meds = summary.get('medications') or []
    lines.append('Current medications: ' + (', '.join(meds) if meds else 'none reported') + '.')
    allergies = summary.get('allergies') or []
    lines.append('Allergies: ' + (', '.join(allergies) if allergies else 'none reported') + '.')
    history = summary.get('medical_history') or 'none reported'
    lines.append(f"Medical history: {history}.")
    lifestyle = summary.get('lifestyle_notes') or 'Not reported'
    vitals = (summary.get('vital_signs') or {}).get('temperature')
    lines.append(f"Lifestyle: {lifestyle}. Temperature: {vitals or 'not reported'}.")
    lines.append(f"Suggested urgency: {summary.get('urgency', 'green')}.")
    text = ' '.join(lines)

    try:
        from ...services.llm import chat_completion, is_configured

        if is_configured():
            polished = chat_completion(
                system='Rewrite the following clinical pre-consult notes as 3-6 concise sentences for a doctor. Do not add facts.',
                user=text,
                temperature=0.1,
                max_tokens=280,
            ).strip()
            if polished:
                return polished
    except Exception:
        pass
    return text


def _build_summary(
    answers: list[dict],
    messages: list[dict],
    triage_context: Optional[dict] = None,
    patient_context: Optional[dict] = None,
) -> dict:
    mapped = _answer_map(answers)
    chief_complaint = _chief_complaint_text(answers, messages)

    adaptive_id = _adaptive_question_id(answers, messages)
    associated = ''
    if adaptive_id in mapped:
        associated = _option_text(adaptive_id, mapped[adaptive_id])

    symptoms = []
    if 'symptoms_duration' in mapped or 'symptoms_severity' in mapped or associated:
        symptoms.append({
            'duration': DURATION_LABELS.get(mapped.get('symptoms_duration', ''), mapped.get('symptoms_duration', 'Not reported')),
            'severity': SEVERITY_LABELS.get(mapped.get('symptoms_severity', ''), mapped.get('symptoms_severity', 'Not reported')),
            'associated': associated,
        })

    medications: list[str] = []
    if mapped.get('medications_current') == 'yes_list':
        med_list = mapped.get('medications_list', '')
        medications = [item.strip() for item in med_list.split(',') if item.strip()]

    allergies: list[str] = []
    if mapped.get('allergies') == 'yes_list':
        allergy_list = mapped.get('allergies_list', '')
        allergies = [item.strip() for item in allergy_list.split(',') if item.strip()]
    elif _known_allergies(patient_context) and not allergies:
        allergies = _known_allergies(patient_context)

    medical_history = ''
    if mapped.get('history_conditions') == 'yes_list':
        medical_history = mapped.get('history_conditions_list', '')
    elif _known_conditions(patient_context) and not medical_history:
        medical_history = ', '.join(_known_conditions(patient_context))

    lifestyle = LIFESTYLE_LABELS.get(mapped.get('lifestyle', ''), mapped.get('lifestyle', 'Not reported'))
    vitals = {}
    if 'vitals_temp' in mapped:
        vitals['temperature'] = TEMP_LABELS.get(mapped['vitals_temp'], mapped['vitals_temp'])

    urgency = compute_urgency(answers, messages, triage_context)
    summary = {
        'chief_complaint': chief_complaint,
        'symptoms': symptoms,
        'medications': medications,
        'allergies': allergies,
        'medical_history': medical_history,
        'lifestyle_notes': lifestyle,
        'vital_signs': vitals,
        'triage_context': triage_context or {},
        'urgency': urgency,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }
    summary['clinical_summary'] = build_clinical_summary(summary, patient_context)
    return summary


def _question_payload(question: Question, answers: list[dict]) -> dict:
    prompt = question.simple_prompt if len(answers) >= 6 else question.prompt
    return {
        'type': 'question',
        'question': {
            'id': question.id,
            'key': question.id,
            'text': prompt,
            'rephrased': False,
            'options': [
                {'id': option.id, 'key': option.id, 'text': option.text, 'emoji': option.emoji}
                for option in question.options
            ],
        },
        'done': False,
    }


def next_turn(
    messages: list[dict],
    answers: list[dict],
    triage_context: Optional[dict] = None,
    patient_context: Optional[dict] = None,
) -> dict:
    working_answers = seed_answers_from_context(list(answers), patient_context)
    has_patient_message = bool(_patient_texts(messages))
    interview_started = bool(working_answers) or has_patient_message

    if not interview_started:
        return {
            'type': 'question',
            'question': {
                'id': 'welcome',
                'key': 'start',
                'text': WELCOME_MESSAGE,
                'rephrased': False,
                'options': [
                    {'id': 'start', 'key': 'start', 'text': "Let's begin", 'emoji': ''},
                ],
            },
            'done': False,
        }

    confirm = _answer_value(working_answers, 'confirm_done')
    if confirm == 'done':
        summary = _build_summary(working_answers, messages, triage_context, patient_context)
        return {
            'type': 'result',
            'preconsult_summary': summary,
            'done': True,
        }
    if confirm == 'add_more' and not _answer_value(working_answers, 'chief_complaint_followup'):
        return {
            'type': 'question',
            'question': {
                'id': 'chief_complaint_followup',
                'key': 'chief_complaint_followup',
                'text': 'What else would you like to add?',
                'rephrased': False,
                'options': [{'id': 'free_text', 'key': 'free_text', 'text': 'Type your answer', 'emoji': ''}],
            },
            'done': False,
        }
    if confirm == 'add_more' and _answer_value(working_answers, 'chief_complaint_followup'):
        summary = _build_summary(working_answers, messages, triage_context, patient_context)
        return {
            'type': 'result',
            'preconsult_summary': summary,
            'done': True,
        }

    if not _answer_value(working_answers, 'chief_complaint') and not has_patient_message:
        return _question_payload(QUESTIONS['chief_complaint'], working_answers)

    if not _answer_value(working_answers, 'chief_complaint') and has_patient_message:
        # Treat the first patient message as the complaint so adaptive questions can run.
        working_answers = working_answers + [{
            'key': 'chief_complaint',
            'answer': _patient_texts(messages)[0],
            'rephrased': False,
        }]

    topic = _next_unanswered_topic(working_answers, messages)
    if topic is None:
        return _question_payload(QUESTIONS['confirm_done'], working_answers)

    question = _next_question_for_topic(topic, working_answers, messages)
    if question is None:
        return _question_payload(QUESTIONS['confirm_done'], working_answers)

    return _question_payload(question, working_answers)
