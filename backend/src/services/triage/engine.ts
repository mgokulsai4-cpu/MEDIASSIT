import {
  Category,
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_SPECIALTY_SCORES,
  detectCategories,
  QUESTIONS,
  TriageQuestion,
} from './lexicon.js';
import { SPECIALTY_BY_CODE } from '../../constants/specialties.js';
import {
  AnswerInput,
  ChatTurn,
  PatientContext,
  TriageChatInput,
  TriageQuestionOut,
  TriageResult,
  UrgencyLevel,
} from './engineTypes.js';

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  green: 'Routine',
  yellow: 'Soon',
  orange: 'Urgent',
  red: 'Emergency',
};

const DISCLAIMER =
  'This is AI-assisted guidance, not a medical diagnosis. Always consult a qualified healthcare professional.';

/* ------------------------- helpers ------------------------- */

function patientTexts(messages: { role: string; text: string }[]): string[] {
  return messages.filter((m) => m.role === 'patient').map((m) => m.text);
}

function wordList(texts: string[]): string {
  return ' ' + texts.join(' ').toLowerCase() + ' ';
}

function hasWord(haystack: string, word: string): boolean {
  return haystack.includes(' ' + word) || haystack.includes(' ' + word + '.') || haystack.includes(' ' + word + ',');
}

function answerValue(answers: AnswerInput[], key: string): string | undefined {
  const a = findAnswer(answers, key);
  return a && a.answer !== 'not_sure' ? a.answer : undefined;
}

function findAnswer(answers: AnswerInput[], key: string): AnswerInput | undefined {
  return answers.find((a) => a.key === key || a.key.startsWith(key + '.'));
}

function answerSev(answers: AnswerInput[]): string | undefined {
  return (
    answerValue(answers, 'Q_fever_severity') ??
    answerValue(answers, 'Q_stomach_sev') ??
    answerValue(answers, 'Q_chest_sev') ??
    answerValue(answers, 'Q_breath_sev') ??
    answerValue(answers, 'Q_head_sev') ??
    answerValue(answers, 'Q_bone_sev') ??
    answerValue(answers, 'Q_skin_sev') ??
    answerValue(answers, 'Q_ent_sev') ??
    answerValue(answers, 'Q_women_sev') ??
    answerValue(answers, 'Q_child_sev')
  );
}

function answerOnset(answers: AnswerInput[]): { label: string; days?: number } {
  const v =
    answerValue(answers, 'Q_fever_onset') ??
    answerValue(answers, 'Q_stomach_onset') ??
    answerValue(answers, 'Q_chest_onset') ??
    answerValue(answers, 'Q_head_onset') ??
    answerValue(answers, 'Q_bone_onset') ??
    answerValue(answers, 'Q_skin_onset') ??
    answerValue(answers, 'Q_ent_onset') ??
    answerValue(answers, 'Q_women_onset') ??
    answerValue(answers, 'Q_child_onset');
  if (v === 'today') return { label: 'Started today', days: 0 };
  if (v === 'days_2_3') return { label: 'Started 2-3 days ago', days: 2 };
  if (v === 'week_more') return { label: 'Been there for more than a week', days: 8 };
  return { label: 'Duration not clear yet' };
}

function collectAssoc(answers: AnswerInput[]): Set<string> {
  const keys = [
    'Q_fever_assoc',
    'Q_chest_assoc',
    'Q_head_assoc',
    'Q_breath_when',
    'Q_breath_fever',
    'Q_bone_cause',
    'Q_skin_type',
    'Q_child_fever',
  ];
  const out = new Set<string>();
  for (const k of keys) {
    const v = answerValue(answers, k);
    if (v) out.add(v);
  }
  return out;
}

const SIMPLE_NOT_SURE_TEXT = 'I don\'t know';

const CATEGORY_FALLBACK_MAP: Record<string, Category> = {
  fever: 'fever',
  cough: 'breathing',
  stomach_pain: 'stomach',
  body_pain: 'bone',
  skin_problem: 'skin',
};

/* ------------------- free-text answer extraction ------------------- */
/* If the user already told us the answer in their own words, do not
   ask the question again. Answers extracted from text never override
   explicit answers sent by the client. */

function anyWord(text: string, words: string[]): boolean {
  return words.some((w) => {
    const at = text.indexOf(' ' + w);
    if (at === -1) return false;
    const after = text[at + 1 + w.length];
    return !after || after === ' ' || after === '.' || after === ',' || after === '?' || after === '!';
  });
}

const SEVERITY_WORDS: [string[], string][] = [
  [['very bad', 'severe', 'unbearable', 'too much'], 'severe'],
  [['moderate', 'medium', 'somewhat'], 'medium'],
  [['a little', 'slight', 'mild', 'not much'], 'little'],
];

const ONSET_WORDS: [string[], string][] = [
  [['just now', 'right now', 'today', 'just started'], 'today'],
  [['yesterday', 'couple of days', 'two days', '2 days', '3 days', '4 days', 'few days'], 'days_2_3'],
  [['week', 'month'], 'week_more'],
];

const ASSOC_WORDS: Record<string, string[]> = {
  sweating: ['sweating', 'sweat', 'paseena'],
  arm_jaw: ['arm pain', 'jaw pain', 'arm', 'jaw'],
  breathing: ['breathless', 'breathing', 'saans', 'dikkubadi'],
  chills: ['chills', 'shivering', 'thanda'],
  body_ache: ['body ache', 'body pain', 'bodyache'],
  vision: ['blurred vision', 'double vision', 'vision'],
  weak: ['weak', 'weakness', 'numb', 'kamjori'],
  vomit: ['vomit', 'vomiting', 'ulti', 'kakkulu', 'vantulu'],
  fall: ['fell', 'fall', 'injury', 'injured', 'chot', 'gir', 'padipoya'],
  rash: ['rash', 'dappulu'],
  allergy: ['allergy', 'itching', 'itch', 'durada', 'kharish'],
  wound: ['wound', 'cut', 'ghav', 'gayam'],
  burn: ['burn', 'burned', 'jala'],
  rest: ['rest', 'resting'],
  sleep: ['sleep', 'sleeping'],
  activity: ['walking', 'working', 'walk'],
  fever_cough: ['fever', 'cough', 'khansi', 'jwaram', 'gummam', 'cold'],
  no_fever: ['no fever', 'no cough'],
  upper: ['upper', 'upper stomach'],
  lower: ['lower', 'lower stomach'],
  whole: ['whole', 'full stomach'],
  // Pain quality
  sharp: ['sharp', 'stabbing', 'piercing'],
  dull: ['dull', 'aching', 'heavy'],
  throbbing: ['throbbing', 'pounding', 'beating'],
  burning: ['burning', 'burns', 'scalding'],
  pressure: ['pressure', 'tightness', 'tight', 'squeezing'],
  crushing: ['crushing', 'crushing pain'],
  crampy: ['cramp', 'cramping', 'cramps', 'spasms'],
  // Aggravating factors
  eating: ['after eating', 'after food', 'when i eat', 'after meals'],
  movement: ['with movement', 'when moving', 'when i move', 'on movement'],
  pressing: ['when pressed', 'when i press', 'on pressing', 'touching'],
  breathing_makes_worse: ['worse with breathing', 'hurts to breathe', 'pain when breathing'],
  exertion: ['with activity', 'when walking', 'on exertion', 'physical activity'],
  lying_down: ['lying down', 'when lying', 'on lying'],
  light: ['bright light', 'light hurts', 'light makes it worse', 'photophobia'],
  sound: ['loud sound', 'noise hurts', 'sound makes it worse'],
  // Pattern
  constant: ['constant', 'all the time', 'always', 'non-stop'],
  intermittent: ['comes and goes', 'on and off', 'intermittent', 'comes go'],
  // Sweating
  yes_sweating: ['sweating a lot', 'sweating profusely', 'drenched'],
  night_sweats: ['night sweat', 'night sweats', 'sweating at night'],
  // Exposure
  travel: ['traveled', 'travel', 'trip', 'journey'],
  sick_contact: ['sick people', 'someone sick', 'exposed to'],
  // Bowel
  diarrhea: ['diarrhea', 'diarrhoea', 'loose stool', 'loose motion', 'dast'],
  constipation: ['constipation', 'constipated', 'hard stool'],
  blood: ['blood in stool', 'blood in vomit', 'bloody stool', 'blood stool'],
  // Nausea
  nausea: ['nausea', 'nauseous', 'feel like throwing', 'want to vomit'],
  vomiting_v: ['vomited', 'vomiting', 'threw up', 'puked'],
  // Cough
  dry: ['dry cough', 'dry coughing'],
  wet: ['wet cough', 'mucus', 'phlegm', 'productive cough'],
  // Wheezing
  yes_wheeze: ['wheeze', 'wheezing', 'whistling'],
  // Swelling
  yes_swelling: ['swollen face', 'swollen lip', 'swollen tongue', 'swelling face'],
  // Head location
  front: ['front of head', 'forehead', 'front head'],
  back: ['back of head', 'back head', 'occipital'],
  one_side: ['one side', 'half head', 'left side', 'right side'],
  all_over: ['all over', 'everywhere', 'whole head'],
  // Head triggers
  // Stiff neck
  stiff_neck: ['stiff neck', 'neck stiffness', 'neck pain'],
  // Bone location
  knee: ['knee', 'knee pain'],
  back_bone: ['back pain', 'lower back', 'upper back'],
  shoulder: ['shoulder', 'shoulder pain'],
  wrist: ['wrist', 'hand pain', 'wrist pain'],
  hip: ['hip', 'hip pain'],
  // Movement
  yes_move: ['move normally', 'moves fine', 'can move'],
  limited: ['limited movement', 'cant move fully', 'stiff'],
  cannot_move: ['cant move', 'cannot move', 'unable to move'],
  // Swelling
  swelling_bone: ['swollen', 'swelling', 'puffy'],
  bruising: ['bruise', 'bruising', 'bruised', 'black and blue'],
  deformity: ['deformity', 'misaligned', 'crooked', 'out of place'],
  // Skin
  spreading: ['spreading', 'getting bigger', 'growing', 'expanding'],
  stable: ['staying the same', 'same size', 'hasnt changed'],
  shrinking: ['getting smaller', 'shrinking', 'fading'],
  itchy_skin: ['itchy', 'itching', 'itch', 'khich khich'],
  painful_skin: ['painful', 'hurts', 'sore'],
  yes_discharge: ['discharge', 'oozing', 'leaking', 'pus'],
  // ENT
  ear: ['ear pain', 'ear ache', 'earache'],
  nose: ['nose', 'nasal', 'runny nose', 'blocked nose'],
  throat_ent: ['sore throat', 'throat pain', 'throat sore'],
  multiple_ent: ['both ears', 'ear and throat', 'multiple areas'],
  hearing_loss: ['hearing loss', 'cant hear', 'ringing', 'tinnitus'],
  difficulty_swallowing: ['difficulty swallowing', 'hard to swallow', 'trouble swallowing', 'painful swallowing'],
  // Women
  before_period: ['before period', 'premenstrual', 'pms'],
  during_period: ['during period', 'on period', 'menstruating'],
  after_period: ['after period', 'post menstrual'],
  not_related: ['not related', 'not period'],
  yes_urination: ['pain when urinating', 'burning urination', 'painful urination', 'dysuria'],
  // Child
  yes_eating: ['eating normally', 'eating fine', 'drinking normally'],
  reduced: ['eating less', 'not eating much', 'drinking less'],
  refusing: ['refusing food', 'not eating', 'not drinking', 'refusing water'],
  irritable: ['irritable', 'crying', 'fussy', 'cranky'],
  unusually_sleepy: ['sleepy', 'lethargic', 'drowsy', 'not active'],
  playful: ['playful', 'active', 'normal behavior'],
  yes_rash: ['rash', 'rashes'],
};

const SEV_KEY_BY_CAT: Record<Category, string> = {
  fever: 'Q_fever_severity',
  stomach: 'Q_stomach_sev',
  chest: 'Q_chest_sev',
  breathing: 'Q_breath_sev',
  head: 'Q_head_sev',
  bone: 'Q_bone_sev',
  skin: 'Q_skin_sev',
  ent: 'Q_ent_sev',
  women: 'Q_women_sev',
  child: 'Q_child_sev',
};

const ONSET_KEY_BY_CAT: Partial<Record<Category, string>> = {
  fever: 'Q_fever_onset',
  stomach: 'Q_stomach_onset',
  chest: 'Q_chest_onset',
  head: 'Q_head_onset',
  bone: 'Q_bone_onset',
  skin: 'Q_skin_onset',
  ent: 'Q_ent_onset',
  women: 'Q_women_onset',
  child: 'Q_child_onset',
};

const ASSOC_KEYS_BY_CAT: Partial<Record<Category, Record<string, string[]>>> = {
  fever: { Q_fever_assoc: ['chills', 'body_ache', 'breathing'] },
  chest: { Q_chest_assoc: ['sweating', 'arm_jaw', 'breathing'] },
  breathing: {
    Q_breath_when: ['rest', 'activity', 'sleep'],
    Q_breath_fever: ['no_fever', 'fever_cough'],
  },
  head: { Q_head_assoc: ['vision', 'weak', 'vomit'] },
  bone: { Q_bone_cause: ['fall'] },
  skin: { Q_skin_type: ['rash', 'allergy', 'wound', 'burn'] },
  stomach: { Q_stomach_loc: ['upper', 'lower', 'whole'] },
  child: { Q_child_fever: ['no_fever', 'fever'] },
};

// Keys for new questions that can be extracted from free text
const EXTRACT_KEYS_BY_CAT: Partial<Record<Category, Record<string, string[]>>> = {
  fever: {
    Q_fever_pattern: ['constant', 'intermittent'],
    Q_fever_sweating: ['yes_sweating', 'night_sweats'],
    Q_fever_exposure: ['travel', 'sick_contact'],
  },
  stomach: {
    Q_stomach_quality: ['sharp', 'crampy', 'burning', 'dull'],
    Q_stomach_aggravating: ['eating', 'movement', 'pressing'],
    Q_stomach_bowel: ['diarrhea', 'constipation', 'blood'],
    Q_stomach_nausea: ['nausea', 'vomiting_v'],
  },
  chest: {
    Q_chest_quality: ['sharp', 'pressure', 'burning', 'crushing'],
    Q_chest_aggravating: ['breathing_makes_worse', 'movement', 'exertion', 'lying_down'],
  },
  breathing: {
    Q_breath_cough: ['dry', 'wet'],
    Q_breath_wheeze: ['yes_wheeze'],
    Q_breath_swelling: ['yes_swelling'],
  },
  head: {
    Q_head_location: ['front', 'back', 'one_side', 'all_over'],
    Q_head_quality: ['throbbing', 'pressure', 'sharp', 'dull'],
    Q_head_triggers: ['light', 'sound', 'movement'],
    Q_head_neck: ['stiff_neck'],
  },
  bone: {
    Q_bone_location: ['knee', 'back_bone', 'shoulder', 'wrist', 'hip'],
    Q_bone_movement: ['yes_move', 'limited', 'cannot_move'],
    Q_bone_swelling: ['swelling_bone', 'bruising', 'deformity'],
  },
  skin: {
    Q_skin_spreading: ['spreading', 'stable', 'shrinking'],
    Q_skin_sensation: ['itchy_skin', 'painful_skin'],
    Q_skin_discharge: ['yes_discharge'],
  },
  ent: {
    Q_ent_location: ['ear', 'nose', 'throat_ent', 'multiple_ent'],
    Q_ent_hearing: ['hearing_loss', 'difficulty_swallowing'],
    Q_ent_discharge: ['yes_discharge'],
  },
  women: {
    Q_women_cycle: ['before_period', 'during_period', 'after_period', 'not_related'],
    Q_women_discharge: ['yes_discharge'],
    Q_women_urination: ['yes_urination'],
  },
  child: {
    Q_child_eating: ['yes_eating', 'reduced', 'refusing'],
    Q_child_behavior: ['irritable', 'unusually_sleepy', 'playful'],
    Q_child_rash: ['yes_rash'],
  },
};

function extractAnswers(texts: string[], cats: Category[]): AnswerInput[] {
  if (texts.length === 0) return [];
  const t = wordList(texts);
  const out: AnswerInput[] = [];
  const push = (key: string, answer: string) => out.push({ key, answer, rephrased: false, from_text: true });

  let sev: string | undefined;
  for (const [words, val] of SEVERITY_WORDS) {
    if (anyWord(t, words)) {
      sev = val;
      break;
    }
  }
  if (sev) for (const cat of cats) push(SEV_KEY_BY_CAT[cat], sev);

  let onset: string | undefined;
  for (const [words, val] of ONSET_WORDS) {
    if (anyWord(t, words)) {
      onset = val;
      break;
    }
  }
  if (onset) {
    for (const cat of cats) {
      const key = ONSET_KEY_BY_CAT[cat];
      if (key) push(key, onset);
    }
  }

  for (const cat of cats) {
    const assocMap = ASSOC_KEYS_BY_CAT[cat] ?? {};
    for (const [qkey, ids] of Object.entries(assocMap)) {
      for (const id of ids) {
        const words = ASSOC_WORDS[id];
        if (words && anyWord(t, words)) push(qkey, id);
      }
    }
    // Also extract from new question categories
    const extractMap = EXTRACT_KEYS_BY_CAT[cat] ?? {};
    for (const [qkey, ids] of Object.entries(extractMap)) {
      for (const id of ids) {
        const words = ASSOC_WORDS[id];
        if (words && anyWord(t, words)) push(qkey, id);
      }
    }
  }
  return out;
}

function mergeAnswers(answers: AnswerInput[], extracted: AnswerInput[]): AnswerInput[] {
  const merged = [...answers];
  for (const e of extracted) {
    const exists = merged.some((a) => a.key === e.key || a.key.startsWith(e.key + '.'));
    if (!exists) merged.push(e);
  }
  return merged;
}

function buildCategoryFallbackQuestion(simple: boolean): TriageQuestionOut {
  const options = [
    { id: 'fever', emoji: 'fever', text: 'Fever' },
    { id: 'cough', emoji: 'lungs', text: 'Cough or cold' },
    { id: 'stomach_pain', emoji: 'stomach', text: 'Stomach pain' },
    { id: 'body_pain', emoji: 'bone', text: 'Body pain or injury' },
    { id: 'skin_problem', emoji: 'sun', text: 'Skin problem' },
    { id: 'dk', emoji: 'question', text: simple ? SIMPLE_NOT_SURE_TEXT : 'I don\'t know' },
  ];
  return {
    id: 'category_fallback',
    key: 'category_fallback',
    text: simple
      ? 'Tap the picture that is closest to your problem. Or tap "I don\'t know".'
      : 'Can you tell us a little more? Which of these is closest to your problem?',
    rephrased: false,
    options: options.map((o) => ({ ...o, key: 'category_fallback.' + o.id })),
  };
}

/* ------------------------- symptom extraction ------------------------- */

const SYMPTOM_PHRASES: { cat: string; phrase: string }[] = [
  { cat: 'bone', phrase: 'knee pain' },
  { cat: 'bone', phrase: 'back pain' },
  { cat: 'bone', phrase: 'joint pain' },
  { cat: 'bone', phrase: 'leg pain' },
  { cat: 'bone', phrase: 'fracture' },
  { cat: 'chest', phrase: 'chest pain' },
  { cat: 'chest', phrase: 'palpitations' },
  { cat: 'head', phrase: 'headache' },
  { cat: 'head', phrase: 'dizziness' },
  { cat: 'head', phrase: 'blurred vision' },
  { cat: 'head', phrase: 'numbness' },
  { cat: 'head', phrase: 'weakness' },
  { cat: 'breathing', phrase: 'cough' },
  { cat: 'breathing', phrase: 'difficulty breathing' },
  { cat: 'breathing', phrase: 'wheezing' },
  { cat: 'stomach', phrase: 'stomach pain' },
  { cat: 'stomach', phrase: 'nausea' },
  { cat: 'stomach', phrase: 'vomiting' },
  { cat: 'stomach', phrase: 'diarrhoea' },
  { cat: 'fever', phrase: 'fever' },
  { cat: 'skin', phrase: 'rash' },
  { cat: 'skin', phrase: 'itching' },
  { cat: 'ent', phrase: 'sore throat' },
  { cat: 'ent', phrase: 'ear pain' },
  { cat: 'ent', phrase: 'hearing' },
];

function extractSymptoms(texts: string[]): { name: string; category: string }[] {
  const t = wordList(texts);
  const out: { name: string; category: string }[] = [];
  for (const row of SYMPTOM_PHRASES) {
    if (t.includes(' ' + row.phrase)) {
      out.push({ name: row.phrase, category: row.cat });
    }
  }
  return out;
}import { computeWarnSigns, computeSpecialties } from './engineHelpers.js';

/* ------------------------- public result helpers ------------------------- */

const SEVERITIES: Record<string, string> = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };

function toOut(q: TriageQuestion, rephrased: boolean, simple: boolean, answeredValues?: Set<string>): TriageQuestionOut {
  const text = simple || rephrased ? q.simplePrompt : q.prompt;
  return {
    id: q.id,
    key: q.id,
    text,
    rephrased,
    options: q.options
      .filter((o) => !answeredValues?.has(o.id))
      .map((o) => ({
        id: o.id,
        key: q.id + '.' + o.id,
        text: o.id === 'not_sure' && simple ? SIMPLE_NOT_SURE_TEXT : o.text,
        emoji: o.emoji,
      })),
  };
}

export function buildCategoryQuestion(simple = false): TriageQuestionOut {
  const options: TriageQuestionOut['options'] = CATEGORIES.map((c) => ({
    id: c,
    key: 'category.' + c,
    text: CATEGORY_LABEL[c],
    emoji: CATEGORY_EMOJI[c],
  }));
  options.push({
    id: 'not_sure',
    key: 'category.not_sure',
    text: simple ? SIMPLE_NOT_SURE_TEXT : 'I am not sure',
    emoji: 'question',
  });
  return {
    id: 'category',
    key: 'category',
    text: simple
      ? 'Tap the picture that is closest to your problem. If none fits, tap "I don\'t know".'
      : 'What problem are you having?',
    rephrased: false,
    options,
  };
}

const SIMPLE_REASONS: Record<string, string> = {
  red: 'Go to a hospital right now. This is an emergency. Do not wait.',
  orange: 'See a doctor today. Do not wait long.',
  yellow: 'See a doctor in the next day or two.',
  green: 'No hurry. You can see a doctor when it is convenient for you.',
};

const SIMPLE_FALLBACK_REASON =
  'See a general doctor (family doctor). They will check you and tell you what to do.';

function buildFallbackGeneral(simple: boolean): TriageResult {
  return {
    symptoms: [],
    duration: { label: simple ? 'Not clear yet' : 'Duration not clear yet' },
    severity: { level: 'mild', label: 'Mild' },
    urgency: { level: 'green', label: 'Routine' },
    recommended_specialties: [
      {
        code: 'D001',
        specialty: 'General Physician',
        department: 'General Medicine',
        relevance: 1,
      },
    ],
    emergency_flag: false,
    warning_signs: [],
    reason: simple
      ? SIMPLE_FALLBACK_REASON
      : 'Since we could not identify a specific problem, we recommend starting with a general physician who can guide you further.',
    disclaimer: DISCLAIMER,
  };
}

function buildResult(
  cats: Category[],
  answers: AnswerInput[],
  texts: string[],
  patient: PatientContext | null | undefined,
  simple: boolean,
): TriageResult {
  const assoc = collectAssoc(answers);
  const sevRaw = answerSev(answers);
  const onset = answerOnset(answers);
  const warnSigns = computeWarnSigns(cats, assoc, texts, sevRaw);

  const map: Record<string, 'mild' | 'moderate' | 'severe'> = {
    little: 'mild',
    medium: 'moderate',
    severe: 'severe',
  };
  const sevLevel = sevRaw && map[sevRaw] ? map[sevRaw] : 'moderate';

  let urgency: UrgencyLevel = 'green';
  if (warnSigns.length > 0) urgency = 'red';
  else if (sevLevel === 'severe') urgency = 'orange';
  else if (sevLevel === 'moderate') urgency = 'yellow';
  else if (onset.days !== undefined && onset.days >= 8) urgency = 'yellow';

  let reason = 'Your symptoms can usually be handled with a routine appointment.';
  if (urgency === 'red') {
    reason =
      'Your symptoms may require immediate medical attention. Please seek emergency medical care now.';
  } else if (urgency === 'orange') {
    reason = 'Your symptoms should be evaluated by a healthcare professional promptly.';
  } else if (urgency === 'yellow') {
    reason =
      'You should seek medical evaluation relatively soon. Consider booking an appointment within the next day or two.';
  }
  if (simple) reason = SIMPLE_REASONS[urgency];

  return {
    symptoms: extractSymptoms(texts),
    duration: onset,
    severity: { level: sevLevel, label: SEVERITIES[sevLevel] },
    urgency: { level: urgency, label: URGENCY_LABEL[urgency] },
    recommended_specialties: computeSpecialties(cats, patient),
    emergency_flag: urgency === 'red',
    warning_signs: warnSigns,
    reason,
    disclaimer: DISCLAIMER,
  };
}/**
 * Main adaptive conversation driver.
 * Returns either the next single question, or the final triage result
 * when enough information has been collected.
 */
export function nextChatTurn(input: TriageChatInput): ChatTurn {
  const simple = input.simple === true;
  const texts = patientTexts(input.messages);
  const answers = input.answers ?? [];
  let cats = detectCategories(texts);

  if (cats.length === 0 && answers.length === 0) {
    return { type: 'question', question: buildCategoryQuestion(simple), done: false };
  }

  const catAnswer = findAnswer(answers, 'category');
  if (catAnswer && catAnswer.answer !== 'not_sure') {
    const chosen = catAnswer.answer as Category;
    if (!cats.includes(chosen)) cats = [chosen, ...cats];
  }
  if (cats.length === 0 && catAnswer && catAnswer.answer === 'not_sure') {
    const fallbackAnswer = findAnswer(answers, 'category_fallback');
    if (!fallbackAnswer) {
      return { type: 'question', question: buildCategoryFallbackQuestion(simple), done: false };
    }
    const mapped = CATEGORY_FALLBACK_MAP[fallbackAnswer.answer];
    if (!mapped) {
      return { type: 'result', triage: buildFallbackGeneral(simple) };
    }
    cats = [mapped];
  }

  const allAnswers = mergeAnswers(answers, extractAnswers(texts, cats));
  const assoc = collectAssoc(allAnswers);
  const sevRaw = answerSev(allAnswers);
  const warnSigns = computeWarnSigns(cats, assoc, texts, sevRaw);
  const highRisk = cats.filter((c) => c === 'chest' || c === 'head' || c === 'breathing');
  if (warnSigns.length > 0 && highRisk.length > 0) {
    return { type: 'result', triage: buildResult(cats, allAnswers, texts, input.patient, simple) };
  }

  // Adaptive depth: for mild cases, skip optional questions after core questions are answered
  const isMild = sevRaw === 'little';
  const coreQuestionsAnswered = [
    sevRaw ? 'sev' : null,
    answerOnset(allAnswers).label !== 'Duration not clear yet' ? 'onset' : null,
  ].filter(Boolean).length >= 2;

  function answeredValuesFor(answers: AnswerInput[], key: string): Set<string> {
  const out = new Set<string>();
  for (const a of answers) {
    if (a.key === key || a.key.startsWith(key + '.')) {
      if (a.answer !== 'not_sure') out.add(a.answer);
    }
  }
  return out;
}

/* Multi-select "anything else?" questions: if the user already named one
   symptom, still ask and just hide the option they already picked. */
const MULTI_ASSOC_KEYS = new Set(['Q_fever_assoc', 'Q_chest_assoc', 'Q_head_assoc']);

// Questions that are less critical for mild cases — can be skipped for adaptive depth
const OPTIONAL_QUESTIONS = new Set([
  'Q_fever_pattern', 'Q_fever_sweating', 'Q_fever_exposure',
  'Q_stomach_quality', 'Q_stomach_aggravating', 'Q_stomach_bowel', 'Q_stomach_nausea',
  'Q_chest_quality', 'Q_chest_aggravating', 'Q_chest_history',
  'Q_breath_cough', 'Q_breath_wheeze', 'Q_breath_swelling',
  'Q_head_location', 'Q_head_quality', 'Q_head_triggers', 'Q_head_neck',
  'Q_bone_location', 'Q_bone_movement', 'Q_bone_swelling',
  'Q_skin_spreading', 'Q_skin_sensation', 'Q_skin_discharge',
  'Q_ent_location', 'Q_ent_hearing', 'Q_ent_discharge',
  'Q_women_cycle', 'Q_women_discharge', 'Q_women_urination',
  'Q_child_eating', 'Q_child_behavior', 'Q_child_rash',
]);

  let index = 0;
  let found: ChatTurn | null = null;
  while (found === null) {
    let progressed = false;
    for (const cat of cats) {
      const list = QUESTIONS[cat];
      if (index < list.length) {
        progressed = true;
        const q = list[index];

        // Adaptive depth: skip optional questions for mild cases after core questions are answered
        if (isMild && coreQuestionsAnswered && OPTIONAL_QUESTIONS.has(q.id)) {
          continue;
        }

        const prev = findAnswer(allAnswers, q.id);
        const answeredValues = answeredValuesFor(allAnswers, q.id);
        if (prev && prev.answer === 'not_sure' && !prev.rephrased) {
          found = { type: 'question', question: toOut(q, true, simple, answeredValues), done: false };
          break;
        }
        if (prev && prev.from_text === true && MULTI_ASSOC_KEYS.has(q.id)) {
          found = { type: 'question', question: toOut(q, false, simple, answeredValues), done: false };
          break;
        }
        if (!prev) {
          found = { type: 'question', question: toOut(q, false, simple, answeredValues), done: false };
          break;
        }
      }
    }
    if (found) break;
    if (!progressed) break;
    index += 1;
  }

  if (found) return found;
  return { type: 'result', triage: buildResult(cats, allAnswers, texts, input.patient, simple) };
}

export { URGENCY_LABEL };