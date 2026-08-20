export const CATEGORIES = [
  'fever',
  'stomach',
  'chest',
  'breathing',
  'head',
  'bone',
  'skin',
  'ent',
  'women',
  'child',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  fever: 'Fever',
  stomach: 'Stomach problem',
  chest: 'Chest or heart',
  breathing: 'Breathing problem',
  head: 'Head or dizziness',
  bone: 'Bone / joint',
  skin: 'Skin',
  ent: 'Ear / nose / throat',
  women: "Women's health",
  child: 'Child health',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  fever: 'fever',
  stomach: 'stomach',
  chest: 'heart',
  breathing: 'lungs',
  head: 'brain',
  bone: 'bone',
  skin: 'sun',
  ent: 'ear',
  women: 'female',
  child: 'baby',
};

const KEYWORDS: Record<Category, string[]> = {
  fever: ['fever', 'temperature', 'chills', 'cold', 'body ache', 'body pain', 'bukhar', 'garmi', 'jwaram', 'jwar', 'gummam'],
  stomach: ['stomach', 'abdomen', 'belly', 'vomiting', 'nausea', 'diarrhoea', 'diarrhea', 'gas', 'acidity', 'indigestion', 'poisoning', 'pet dard', 'ulti', 'dast', 'kadupu', 'kadupu noppi', 'kakkulu', 'vantulu'],
  chest: ['chest', 'heart', 'palpitation', 'palpitations', 'cardiac', 'pounding', 'seene', 'chhati', 'dil', 'gunde', 'gundelu', 'eduru'],
  breathing: ['breath', 'breathing', 'wheeze', 'wheezing', 'cough', 'shortness', 'suffocat', 'saans', 'khansi', 'saans lene me dikkat', 'swasam', 'dikkubadi', 'digubadi'],
  head: ['headache', 'dizzy', 'dizziness', 'vertigo', 'faint', 'numb', 'vision', 'migraine', 'seizure', 'convulsion', 'blurred', 'sir dard', 'chakkar', 'behosh', 'kamjori', 'tala noppi', 'tala tippu', 'tala tirugu', 'moorecha'],
  bone: ['knee', 'bone', 'joint', 'fall', 'fracture', 'back pain', 'sprain', 'swell', 'twist', 'injur', 'muscle', 'leg', 'arm', 'chot', 'haddi', 'gir', 'moch', 'sujan', 'noppi', 'eluku', 'elukula noppi', 'kaalu', 'cheyyi'],
  skin: ['rash', 'skin', 'itch', 'itching', 'burn', 'wound', 'boil', 'acne', 'hives', 'kharish', 'daag', 'jala', 'foda', 'ghav', 'durada', 'dappulu', 'gayam', 'gayalu'],
  ent: ['ear', 'throat', 'nose', 'hearing', 'sinus', 'tonsil', 'sore throat', 'kan dard', 'gala', 'naak', 'kan', 'chevi', 'chevi noppi', 'gonthu', 'mukku'],
  women: ['period', 'pregnancy', 'menstrual', 'vaginal', 'pregnant', 'cramps', 'mahwari', 'garbh', 'ruthuvu', 'garabham'],
  child: ['child', 'baby', 'toddler', 'infant', 'kid', 'bachcha', 'bachhe', 'bache', 'pilla', 'pilladu', 'papa', 'bidda'],
};

export function detectCategories(texts: string[]): Category[] {
  const joined = ' ' + texts.join(' ').toLowerCase() + ' ';
  const hits: { cat: Category; at: number }[] = [];
  for (const cat of CATEGORIES) {
    for (const kw of KEYWORDS[cat]) {
      const at = joined.indexOf(' ' + kw);
      if (at === -1) continue;
      const after = joined[at + 1 + kw.length];
      if (after && after !== ' ' && after !== '.' && after !== ',' && after !== '?' && after !== '!') continue;
      hits.push({ cat, at });
      break;
    }
  }
  hits.sort((a, b) => a.at - b.at);
  return hits.map((h) => h.cat);
}

export interface TriageOption {
  id: string;
  emoji: string;
  text: string;
}

export interface TriageQuestion {
  id: string;
  prompt: string;
  simplePrompt: string;
  options: TriageOption[];
}

const OPT_NOT_SURE: TriageOption = { id: 'not_sure', emoji: 'question', text: 'I am not sure' };

function sevOptions(): TriageOption[] {
  return [
    { id: 'little', emoji: 'smile', text: 'A little' },
    { id: 'medium', emoji: 'meh', text: 'Medium' },
    { id: 'severe', emoji: 'frown', text: 'Very bad' },
    OPT_NOT_SURE,
  ];
}

function onsetOptions(): TriageOption[] {
  return [
    { id: 'today', emoji: 'clock', text: 'Today' },
    { id: 'days_2_3', emoji: 'clock', text: '2-3 days ago' },
    { id: 'week_more', emoji: 'hourglass', text: 'More than a week' },
    OPT_NOT_SURE,
  ];
}

export interface QuestionBank extends Record<string, TriageQuestion> {}

export const QUESTIONS: Record<Category, TriageQuestion[]> = {
  fever: [
    {
      id: 'Q_fever_severity',
      prompt: 'How bad do you feel with the fever?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_fever_onset',
      prompt: 'When did the fever start?',
      simplePrompt: 'How long has the fever been there?',
      options: onsetOptions(),
    },
    {
      id: 'Q_fever_assoc',
      prompt: 'Do you also have any of these?',
      simplePrompt: 'Pick anything else you feel?',
      options: [
        { id: 'chills', emoji: 'snowflake', text: 'Chills or shivering' },
        { id: 'body_ache', emoji: 'tired', text: 'Body ache' },
        { id: 'breathing', emoji: 'lungs', text: 'Trouble breathing' },
        OPT_NOT_SURE,
      ],
    },
  ],
  stomach: [
    {
      id: 'Q_stomach_loc',
      prompt: 'Where does it hurt?',
      simplePrompt: 'Where is the pain? Top, middle, bottom or whole stomach?',
      options: [
        { id: 'upper', emoji: 'arrow-up', text: 'Upper stomach' },
        { id: 'lower', emoji: 'arrow-down', text: 'Lower stomach' },
        { id: 'whole', emoji: 'circle', text: 'Whole stomach' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_stomach_onset',
      prompt: 'When did it start?',
      simplePrompt: 'How long has the pain been there?',
      options: onsetOptions(),
    },
    {
      id: 'Q_stomach_sev',
      prompt: 'How bad is the pain?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
  ],
  chest: [
    {
      id: 'Q_chest_sev',
      prompt: 'How bad is the chest pain?',
      simplePrompt: 'How bad is the pain? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_chest_assoc',
      prompt: 'Do you also have any of these?',
      simplePrompt: 'Pick anything else you feel?',
      options: [
        { id: 'sweating', emoji: 'sweat', text: 'Sweating' },
        { id: 'arm_jaw', emoji: 'hand', text: 'Pain in arm or jaw' },
        { id: 'breathing', emoji: 'lungs', text: 'Trouble breathing' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_chest_onset',
      prompt: 'When did the chest pain start?',
      simplePrompt: 'How long has the pain been there?',
      options: onsetOptions(),
    },
  ],
  breathing: [
    {
      id: 'Q_breath_when',
      prompt: 'When do you feel breathless?',
      simplePrompt: 'When do you find it hard to breathe?',
      options: [
        { id: 'rest', emoji: 'bed', text: 'While resting' },
        { id: 'activity', emoji: 'walking', text: 'When walking or working' },
        { id: 'sleep', emoji: 'moon', text: 'While sleeping' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_breath_sev',
      prompt: 'How bad is it?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_breath_fever',
      prompt: 'Do you have fever or cough too?',
      simplePrompt: 'Do you have fever or cough?',
      options: [
        { id: 'fever_cough', emoji: 'fever', text: 'Yes, fever or cough' },
        { id: 'no_fever', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
    },
  ],
  head: [
    {
      id: 'Q_head_sev',
      prompt: 'How bad is the headache or dizziness?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_head_assoc',
      prompt: 'Do you also have any of these?',
      simplePrompt: 'Pick anything else you feel?',
      options: [
        { id: 'vision', emoji: 'eye', text: 'Blurred or double vision' },
        { id: 'weak', emoji: 'person', text: 'Weakness or numbness on one side' },
        { id: 'vomit', emoji: 'poop', text: 'Vomiting' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_head_onset',
      prompt: 'When did it start?',
      simplePrompt: 'How long has it been there?',
      options: onsetOptions(),
    },
  ],
  bone: [
    {
      id: 'Q_bone_sev',
      prompt: 'How much does it hurt?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_bone_cause',
      prompt: 'Did you have a fall or injury?',
      simplePrompt: 'Did you fall or get hurt?',
      options: [
        { id: 'fall', emoji: 'alert', text: 'Yes, I fell or got hurt' },
        { id: 'no_injury', emoji: 'thumbs-up', text: 'No injury' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_bone_onset',
      prompt: 'When did the pain start?',
      simplePrompt: 'How long is it since the problem started?',
      options: onsetOptions(),
    },
  ],
  skin: [
    {
      id: 'Q_skin_sev',
      prompt: 'How bad is the skin problem?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_skin_type',
      prompt: 'What does it look like?',
      simplePrompt: 'What do you see on the skin?',
      options: [
        { id: 'rash', emoji: 'dots', text: 'Rash or redness' },
        { id: 'allergy', emoji: 'alert', text: 'Allergy or itching' },
        { id: 'wound', emoji: 'bandage', text: 'Wound or cut' },
        { id: 'burn', emoji: 'fire', text: 'Burn' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_skin_onset',
      prompt: 'When did it first appear?',
      simplePrompt: 'How long has it been there?',
      options: onsetOptions(),
    },
  ],
  ent: [
    {
      id: 'Q_ent_sev',
      prompt: 'How bad is it?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_ent_onset',
      prompt: 'When did it start?',
      simplePrompt: 'How long has it been there?',
      options: onsetOptions(),
    },
  ],
  women: [
    {
      id: 'Q_women_sev',
      prompt: 'How bad is the problem?',
      simplePrompt: 'How bad is it? A little, medium or very bad?',
      options: sevOptions(),
    },
    {
      id: 'Q_women_onset',
      prompt: 'When did it start?',
      simplePrompt: 'How long has it been there?',
      options: onsetOptions(),
    },
  ],
  child: [
    {
      id: 'Q_child_sev',
      prompt: 'How sick does the child feel?',
      simplePrompt: 'How bad is the child feeling?',
      options: sevOptions(),
    },
    {
      id: 'Q_child_fever',
      prompt: 'Does the child have fever?',
      simplePrompt: 'Does the child have fever?',
      options: [
        { id: 'fever', emoji: 'fever', text: 'Yes, fever' },
        { id: 'no_fever', emoji: 'thumbs-up', text: 'No fever' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_child_onset',
      prompt: 'Since when is the child unwell?',
      simplePrompt: 'How long has the child been unwell?',
      options: onsetOptions(),
    },
  ],
};

export const CATEGORY_SPECIALTY_SCORES: Record<string, Record<string, number>> = {
  fever: { D001: 8, D007: 6, D009: 3 },
  stomach: { D001: 7, D004: 5, D007: 4, D002: 1 },
  chest: { D002: 12, D009: 6, D001: 3 },
  breathing: { D009: 12, D002: 5, D001: 4 },
  head: { D005: 10, D001: 4 },
  bone: { D003: 10, D001: 3 },
  skin: { D006: 10, D001: 3 },
  ent: { D008: 10, D001: 3 },
  women: { D004: 10, D001: 3 },
  child: { D007: 10, D001: 3 },
};