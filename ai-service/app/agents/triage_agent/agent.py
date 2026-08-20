"""Adaptive rule-based triage engine.

Faithful port of ``backend/src/services/triage/engine.ts`` so the two
implementations behave identically and the backend's test scenarios hold
whether the local engine or this service handles the conversation.
"""
from __future__ import annotations

from typing import Optional

from ...services.languages import lang
from . import lexicon as L
from .lexicon import CATEGORIES, QUESTIONS
from .types import PatientContext, Question

DISCLAIMER = lang.t('disclaimer', _fallback='This is AI-assisted guidance, not a medical diagnosis.')

URGENCY_LABEL = {level: lang.t('urgency_label.' + level, _fallback=level) for level in ('green', 'yellow', 'orange', 'red')}
SEVERITY_LABEL = {level: lang.t('severity_label.' + level, _fallback=level) for level in ('mild', 'moderate', 'severe')}

SEV_FALLBACK = 'moderate'

SEV_KEYS = [
    'Q_fever_severity', 'Q_stomach_sev', 'Q_chest_sev', 'Q_breath_sev', 'Q_head_sev',
    'Q_bone_sev', 'Q_skin_sev', 'Q_ent_sev', 'Q_women_sev', 'Q_child_sev',
]

ONSET_KEYS = [
    'Q_fever_onset', 'Q_stomach_onset', 'Q_chest_onset', 'Q_head_onset', 'Q_bone_onset',
    'Q_skin_onset', 'Q_ent_onset', 'Q_women_onset', 'Q_child_onset',
]

ASSOC_KEYS = [
    'Q_fever_assoc', 'Q_chest_assoc', 'Q_head_assoc', 'Q_breath_when', 'Q_breath_fever',
    'Q_bone_cause', 'Q_skin_type', 'Q_child_fever',
]

SYMPTOM_PHRASES = [
    ('bone', 'knee pain'), ('bone', 'back pain'), ('bone', 'joint pain'), ('bone', 'leg pain'),
    ('bone', 'fracture'), ('chest', 'chest pain'), ('chest', 'palpitations'), ('head', 'headache'),
    ('head', 'dizziness'), ('head', 'blurred vision'), ('head', 'numbness'), ('head', 'weakness'),
    ('breathing', 'cough'), ('breathing', 'difficulty breathing'), ('breathing', 'wheezing'),
    ('stomach', 'stomach pain'), ('stomach', 'nausea'), ('stomach', 'vomiting'),
    ('stomach', 'diarrhoea'), ('fever', 'fever'), ('skin', 'rash'), ('skin', 'itching'),
    ('ent', 'sore throat'), ('ent', 'ear pain'), ('ent', 'hearing'),
]

# ----------------------------- helpers -----------------------------


def patient_texts(messages: list[dict]) -> list[str]:
    return [m['text'] for m in messages if m.get('role') == 'patient']


def word_list(texts: list[str]) -> str:
    return ' ' + ' '.join(texts).lower() + ' '


def has_word(haystack: str, word: str) -> bool:
    return (' ' + word + ' ') in haystack or (' ' + word + '.') in haystack or (' ' + word + ',') in haystack


def answer_value(answers: list[dict], key: str) -> Optional[str]:
    found = answer_indent(answers, key)
    if found and found.get('answer') != 'not_sure':
        return str(found.get('answer'))
    return None


def answer_indent(answers: list[dict], key: str) -> Optional[dict]:
    for a in answers:
        ak = str(a.get('key', ''))
        if ak == key or ak.startswith(key + '.'):
            return a
    return None


def answer_sev(answers: list[dict]) -> Optional[str]:
    for key in SEV_KEYS:
        value = answer_value(answers, key)
        if value is not None:
            return value
    return None


def answer_onset(answers: list[dict]) -> dict:
    value = None
    for key in ONSET_KEYS:
        found = answer_value(answers, key)
        if found is not None:
            value = found
            break
    if value == 'today':
        return {'label': 'Started today', 'days': 0}
    if value == 'days_2_3':
        return {'label': 'Started 2-3 days ago', 'days': 2}
    if value == 'week_more':
        return {'label': 'Been there for more than a week', 'days': 8}
    return {'label': 'Duration not clear yet'}


def collect_assoc(answers: list[dict]) -> set:
    out = set()
    for key in ASSOC_KEYS:
        value = answer_value(answers, key)
        if value is not None:
            out.add(value)
    return out


def extract_symptoms(texts: list[str]) -> list[dict]:
    t = word_list(texts)
    out = []
    for cat, phrase in SYMPTOM_PHRASES:
        if (' ' + phrase) in t:
            out.append({'name': phrase, 'category': cat})
    return out

def compute_warn_signs(cats: list[str], assoc: set, texts: list[str], sev_in: Optional[str]) -> list[str]:
    t = word_list(texts)
    signs = []
    if 'chest' in cats and bool(assoc & {'sweating', 'arm_jaw', 'breathing'}):
        signs.append('Chest pain together with sweating, pain in the arm or jaw, or trouble breathing may point to a heart problem.')
    if 'chest' in cats and has_word(t, 'sweating'):
        signs.append('Chest pain together with sweating may point to a heart problem.')
    if 'breathing' in cats and bool(assoc & {'rest', 'sleep'}):
        signs.append('Breathing difficulty while at rest or while sleeping needs immediate attention.')
    if 'head' in cats and bool(assoc & {'vision', 'weak'}):
        signs.append('Sudden vision change or weakness/numbness on one side may be a sign of stroke.')
    if any(has_word(t, w) for w in ('seizure', 'convulsion', 'fainted', 'unconscious')):
        signs.append('Seizure, fainting or loss of consciousness requires urgent care.')
    if 'bone' in cats and 'fall' in assoc and sev_in == 'severe':
        signs.append('An injury with severe pain may need urgent examination.')
    if has_word(t, 'bleeding') and sev_in == 'severe':
        signs.append('Bleeding that is not stopping needs urgent care.')
    return signs


def compute_specialties(cats: list[str], patient: Optional[PatientContext]) -> list[dict]:
    scores: dict[str, int] = {}
    for cat in cats:
        for code, score in (L.CATEGORY_SPECIALTY_SCORES.get(cat) or {}).items():
            scores[code] = scores.get(code, 0) + score

    age = patient.age if patient else None
    conditions = [c.lower() for c in (patient.existing_conditions or [])] if patient else []
    if age is not None:
        if age < 18:
            scores['D007'] = scores.get('D007', 0) + 6
        if age >= 60:
            scores['D001'] = scores.get('D001', 0) + 3
    for c in conditions:
        if any(k in c for k in ('heart', 'hypertension', 'blood pressure', 'bp')):
            scores['D002'] = scores.get('D002', 0) + 4
            scores['D001'] = scores.get('D001', 0) + 2
        if 'diabet' in c:
            scores['D010'] = scores.get('D010', 0) + 4
            scores['D001'] = scores.get('D001', 0) + 2
        if 'asthma' in c or 'lung' in c:
            scores['D009'] = scores.get('D009', 0) + 4

    if not cats:
        scores['D001'] = scores.get('D001', 0) + 8

    ordered = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
    max_score = ordered[0][1] if ordered else 1
    out = []
    for code, sc in ordered:
        meta = L.SPECIALTIES.get(code, {})
        out.append({
            'code': code,
            'specialty': meta.get('name', code),
            'department': meta.get('department', ''),
            'relevance': round(sc / max_score, 2),
        })
    return out

# ----------------------------- turn builders -----------------------------


def answered_values_for(answers: list[dict], key: str) -> set:
    out = set()
    for a in answers:
        ak = str(a.get('key', ''))
        if ak == key or ak.startswith(key + '.'):
            if a.get('answer') != 'not_sure':
                out.add(str(a.get('answer')))
    return out


def to_out(q: Question, rephrased: bool, simple: bool = False, answered_values: Optional[set] = None) -> dict:
    options = [
        o for o in q.options
        if not answered_values or o.id not in answered_values
    ]
    return {
        'id': q.id,
        'key': q.id,
        'text': q.simple_prompt if (simple or rephrased) else q.prompt,
        'rephrased': rephrased,
        'options': [
            {
                'id': o.id,
                'key': q.id + '.' + o.id,
                'text': SIMPLE_NOT_SURE_TEXT if (simple and o.id == 'not_sure') else o.text,
                'emoji': o.emoji,
            }
            for o in options
        ],
    }


SIMPLE_NOT_SURE_TEXT = lang.t('not_sure_simple', _fallback="I don't know")


def build_category_question(simple: bool = False) -> dict:
    options = [
        {'id': c, 'key': 'category.' + c, 'text': L.CATEGORY_LABEL[c], 'emoji': L.CATEGORY_EMOJI[c]}
        for c in CATEGORIES
    ]
    options.append({
        'id': 'not_sure',
        'key': 'category.not_sure',
        'text': SIMPLE_NOT_SURE_TEXT if simple else L.NOT_SURE.text,
        'emoji': L.NOT_SURE.emoji,
    })
    return {
        'id': 'category',
        'key': 'category',
        'text': lang.t(
            'category_question_simple',
            _fallback='Tap the picture that is closest to your problem. If none fits, tap "I don\'t know".',
        ) if simple else lang.t('category_question', _fallback='What problem are you having?'),
        'rephrased': False,
        'options': options,
    }


CATEGORY_FALLBACK_MAP = {
    'fever': 'fever',
    'cough': 'breathing',
    'stomach_pain': 'stomach',
    'body_pain': 'bone',
    'skin_problem': 'skin',
}

CATEGORY_FALLBACK_OPTIONS = [
    ('fever', 'fever', 'Fever'),
    ('cough', 'lungs', 'Cough or cold'),
    ('stomach_pain', 'stomach', 'Stomach pain'),
    ('body_pain', 'bone', 'Body pain or injury'),
    ('skin_problem', 'sun', 'Skin problem'),
]


def build_category_fallback_question(simple: bool = False) -> dict:
    options = [
        {
            'id': oid,
            'key': 'category_fallback.' + oid,
            'text': lang.t('category_fallback_option.' + oid, _fallback=text),
            'emoji': emoji,
        }
        for oid, emoji, text in CATEGORY_FALLBACK_OPTIONS
    ]
    options.append({
        'id': 'dk',
        'key': 'category_fallback.dk',
        'text': SIMPLE_NOT_SURE_TEXT if simple else "I don't know",
        'emoji': 'question',
    })
    return {
        'id': 'category_fallback',
        'key': 'category_fallback',
        'text': lang.t(
            'category_fallback_question_simple',
            _fallback='Tap the picture that is closest to your problem. Or tap "I don\'t know".',
        ) if simple else lang.t(
            'category_fallback_question',
            _fallback='Can you tell us a little more? Which of these is closest to your problem?',
        ),
        'rephrased': False,
        'options': options,
    }


def build_fallback_general(simple: bool = False) -> dict:
    return {
        'symptoms': [],
        'duration': {'label': 'Not clear yet' if simple else 'Duration not clear yet'},
        'severity': {'level': 'mild', 'label': SEVERITY_LABEL['mild']},
        'urgency': {'level': 'green', 'label': URGENCY_LABEL['green']},
        'recommended_specialties': [
            {'code': 'D001', 'specialty': 'General Physician', 'department': 'General Medicine', 'relevance': 1}
        ],
        'emergency_flag': False,
        'warning_signs': [],
        'reason': lang.t(
            'fallback_reason_simple',
            _fallback='See a general doctor (family doctor). They will check you and tell you what to do.',
        ) if simple else lang.t('fallback_reason', _fallback='We could not identify a specific problem. Please start with a general physician.'),
        'disclaimer': DISCLAIMER,
    }


# ------------------- free-text answer extraction -------------------
# If the user already told us the answer in their own words, do not
# ask the question again. Extracted answers never override explicit ones.

SEVERITY_WORDS: list[tuple[list[str], str]] = [
    (['very bad', 'severe', 'unbearable', 'too much'], 'severe'),
    (['moderate', 'medium', 'somewhat'], 'medium'),
    (['a little', 'slight', 'mild', 'not much'], 'little'),
]

ONSET_WORDS: list[tuple[list[str], str]] = [
    (['just now', 'right now', 'today', 'just started'], 'today'),
    (['yesterday', 'couple of days', 'two days', '2 days', '3 days', '4 days', 'few days'], 'days_2_3'),
    (['week', 'month'], 'week_more'),
]

ASSOC_WORDS: dict[str, list[str]] = {
    'sweating': ['sweating', 'sweat', 'paseena'],
    'arm_jaw': ['arm pain', 'jaw pain', 'arm', 'jaw'],
    'breathing': ['breathless', 'breathing', 'saans', 'dikkubadi'],
    'chills': ['chills', 'shivering', 'thanda'],
    'body_ache': ['body ache', 'body pain', 'bodyache'],
    'vision': ['blurred vision', 'double vision', 'vision'],
    'weak': ['weak', 'weakness', 'numb', 'kamjori'],
    'vomit': ['vomit', 'vomiting', 'ulti', 'kakkulu', 'vantulu'],
    'fall': ['fell', 'fall', 'injury', 'injured', 'chot', 'gir', 'padipoya'],
    'rash': ['rash', 'dappulu'],
    'allergy': ['allergy', 'itching', 'itch', 'durada', 'kharish'],
    'wound': ['wound', 'cut', 'ghav', 'gayam'],
    'burn': ['burn', 'burned', 'jala'],
    'rest': ['rest', 'resting'],
    'sleep': ['sleep', 'sleeping'],
    'activity': ['walking', 'working', 'walk'],
    'fever_cough': ['fever', 'cough', 'khansi', 'jwaram', 'gummam', 'cold'],
    'no_fever': ['no fever', 'no cough'],
    'upper': ['upper', 'upper stomach'],
    'lower': ['lower', 'lower stomach'],
    'whole': ['whole', 'full stomach'],
}

SEV_KEY_BY_CAT = {
    'fever': 'Q_fever_severity', 'stomach': 'Q_stomach_sev', 'chest': 'Q_chest_sev',
    'breathing': 'Q_breath_sev', 'head': 'Q_head_sev', 'bone': 'Q_bone_sev',
    'skin': 'Q_skin_sev', 'ent': 'Q_ent_sev', 'women': 'Q_women_sev', 'child': 'Q_child_sev',
}

ONSET_KEY_BY_CAT = {
    'fever': 'Q_fever_onset', 'stomach': 'Q_stomach_onset', 'chest': 'Q_chest_onset',
    'head': 'Q_head_onset', 'bone': 'Q_bone_onset', 'skin': 'Q_skin_onset',
    'ent': 'Q_ent_onset', 'women': 'Q_women_onset', 'child': 'Q_child_onset',
}

ASSOC_KEYS_BY_CAT = {
    'fever': {'Q_fever_assoc': ['chills', 'body_ache', 'breathing']},
    'chest': {'Q_chest_assoc': ['sweating', 'arm_jaw', 'breathing']},
    'breathing': {'Q_breath_when': ['rest', 'activity', 'sleep'], 'Q_breath_fever': ['no_fever', 'fever_cough']},
    'head': {'Q_head_assoc': ['vision', 'weak', 'vomit']},
    'bone': {'Q_bone_cause': ['fall']},
    'skin': {'Q_skin_type': ['rash', 'allergy', 'wound', 'burn']},
    'stomach': {'Q_stomach_loc': ['upper', 'lower', 'whole']},
    'child': {'Q_child_fever': ['no_fever', 'fever']},
}


def _any_word(text: str, words: list[str]) -> bool:
    for w in words:
        at = text.find(' ' + w)
        if at == -1:
            continue
        after = text[at + 1 + len(w)]
        if after and after not in (' ', '.', ',', '?', '!'):
            continue
        return True
    return False


def extract_answers(texts: list[str], cats: list[str]) -> list[dict]:
    if not texts:
        return []
    t = word_list(texts)
    out: list[dict] = []
    push = lambda key, answer: out.append({'key': key, 'answer': answer, 'rephrased': False, 'from_text': True})

    sev = None
    for words, val in SEVERITY_WORDS:
        if _any_word(t, words):
            sev = val
            break
    if sev:
        for cat in cats:
            push(SEV_KEY_BY_CAT[cat], sev)

    onset = None
    for words, val in ONSET_WORDS:
        if _any_word(t, words):
            onset = val
            break
    if onset:
        for cat in cats:
            key = ONSET_KEY_BY_CAT.get(cat)
            if key:
                push(key, onset)

    for cat in cats:
        for qkey, ids in (ASSOC_KEYS_BY_CAT.get(cat) or {}).items():
            for assoc_id in ids:
                words = ASSOC_WORDS.get(assoc_id)
                if words and _any_word(t, words):
                    push(qkey, assoc_id)
    return out


def merge_answers(answers: list[dict], extracted: list[dict]) -> list[dict]:
    merged = [dict(a) for a in answers]
    for e in extracted:
        exists = any(
            a.get('key') == e['key'] or str(a.get('key', '')).startswith(e['key'] + '.')
            for a in merged
        )
        if not exists:
            merged.append(e)
    return merged

def build_result(cats: list[str], answers: list[dict], texts: list[str], patient: Optional[PatientContext], simple: bool = False) -> dict:
    assoc = collect_assoc(answers)
    sev_raw = answer_sev(answers)
    onset = answer_onset(answers)
    warn_signs = compute_warn_signs(cats, assoc, texts, sev_raw)

    sev_map = {'little': 'mild', 'medium': 'moderate', 'severe': 'severe'}
    sev_level = sev_map.get(sev_raw, SEV_FALLBACK) if sev_raw else SEV_FALLBACK

    urgency = 'green'
    if warn_signs:
        urgency = 'red'
    elif sev_level == 'severe':
        urgency = 'orange'
    elif sev_level == 'moderate':
        urgency = 'yellow'
    elif onset.get('days') is not None and onset['days'] >= 8:
        urgency = 'yellow'

    if simple:
        reason = lang.t('reason_simple.' + urgency, _fallback=REASON_SIMPLE_FALLBACK[urgency])
    elif urgency == 'red':
        reason = lang.t('reason.red')
    elif urgency == 'orange':
        reason = lang.t('reason.orange')
    elif urgency == 'yellow':
        reason = lang.t('reason.yellow')
    else:
        reason = lang.t('reason.routine')

    return {
        'symptoms': extract_symptoms(texts),
        'duration': onset,
        'severity': {'level': sev_level, 'label': SEVERITY_LABEL[sev_level]},
        'urgency': {'level': urgency, 'label': URGENCY_LABEL[urgency]},
        'recommended_specialties': compute_specialties(cats, patient),
        'emergency_flag': urgency == 'red',
        'warning_signs': warn_signs,
        'reason': reason,
        'disclaimer': DISCLAIMER,
    }


REASON_SIMPLE_FALLBACK = {
    'red': 'Go to a hospital right now. This is an emergency. Do not wait.',
    'orange': 'See a doctor today. Do not wait long.',
    'yellow': 'See a doctor in the next day or two.',
    'green': 'No hurry. You can see a doctor when it is convenient for you.',
}

MULTI_ASSOC_KEYS = {'Q_fever_assoc', 'Q_chest_assoc', 'Q_head_assoc'}


def next_chat_turn(messages: list[dict], answers: list[dict], patient: Optional[dict] = None, simple: bool = False) -> dict:
    """Main adaptive conversation driver (see the TS port).

    Returns ``{'type': 'question', ...}`` or ``{'type': 'result', triage: ...}``.
    """
    texts = patient_texts(messages)
    answers = answers or []
    p = PatientContext(
        age=patient.get('age') if patient else None,
        gender=patient.get('gender') if patient else None,
        existing_conditions=patient.get('existing_conditions') if patient else None,
    )

    cats = L.detect_categories(texts)

    if not cats and answers:
        seen_cats: set[str] = set()
        for a in answers:
            ak = a.get('key', '')
            if ak == 'category':
                continue
            for cat, qlist in QUESTIONS.items():
                if any(q.id == ak or ak.startswith(q.id + '.') for q in qlist):
                    seen_cats.add(cat)
                    break
        for c in seen_cats:
            cats.append(c)

    if not cats and not answers:
        return {'type': 'question', 'question': build_category_question(simple), 'done': False}

    cat_answer = answer_indent(answers, 'category')
    if cat_answer and cat_answer.get('answer') != 'not_sure':
        chosen = str(cat_answer.get('answer'))
        if chosen not in cats:
            cats.insert(0, chosen)
    if not cats and cat_answer and cat_answer.get('answer') == 'not_sure':
        fallback_answer = answer_indent(answers, 'category_fallback')
        if fallback_answer is None:
            return {'type': 'question', 'question': build_category_fallback_question(simple), 'done': False}
        mapped = CATEGORY_FALLBACK_MAP.get(str(fallback_answer.get('answer')))
        if mapped is None:
            return {'type': 'result', 'triage': build_fallback_general(simple)}
        cats = [mapped]

    all_answers = merge_answers(answers, extract_answers(texts, cats))
    assoc = collect_assoc(all_answers)
    sev_raw = answer_sev(all_answers)
    warn_signs = compute_warn_signs(cats, assoc, texts, sev_raw)
    high_risk = [c for c in cats if c in ('chest', 'head', 'breathing')]
    if warn_signs and high_risk:
        return {'type': 'result', 'triage': build_result(cats, all_answers, texts, p, simple)}

    index = 0
    while True:
        progressed = False
        found = None
        for cat in cats:
            qlist = QUESTIONS.get(cat, [])
            if index < len(qlist):
                progressed = True
                q = qlist[index]
                prev = answer_indent(all_answers, q.id)
                answered_values = answered_values_for(all_answers, q.id)
                if prev and prev.get('answer') == 'not_sure' and not prev.get('rephrased'):
                    found = {'type': 'question', 'question': to_out(q, True, simple, answered_values), 'done': False}
                    break
                if prev and prev.get('from_text') and q.id in MULTI_ASSOC_KEYS:
                    found = {'type': 'question', 'question': to_out(q, False, simple, answered_values), 'done': False}
                    break
                if prev is None:
                    found = {'type': 'question', 'question': to_out(q, False, simple, answered_values), 'done': False}
                    break
        if found:
            return found
        if not progressed:
            break
        index += 1

    return {'type': 'result', 'triage': build_result(cats, all_answers, texts, p, simple)}