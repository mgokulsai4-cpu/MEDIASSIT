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
    {
      id: 'Q_fever_pattern',
      prompt: 'Is the fever constant or does it come and go?',
      simplePrompt: 'Is the fever always there or does it go up and down?',
      options: [
        { id: 'constant', emoji: 'time', text: 'Constant, all the time' },
        { id: 'intermittent', emoji: 'pause', text: 'Comes and goes' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_fever_sweating',
      prompt: 'Are you sweating a lot or having night sweats?',
      simplePrompt: 'Are you sweating a lot?',
      options: [
        { id: 'yes_sweating', emoji: 'water', text: 'Yes, sweating a lot' },
        { id: 'night_sweats', emoji: 'moon', text: 'Night sweats' },
        { id: 'no_sweating', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_fever_exposure',
      prompt: 'Have you recently traveled or been around sick people?',
      simplePrompt: 'Did you travel recently or meet someone who is sick?',
      options: [
        { id: 'travel', emoji: 'airplane', text: 'Recent travel' },
        { id: 'sick_contact', emoji: 'people', text: 'Been around sick people' },
        { id: 'neither', emoji: 'thumbs-up', text: 'Neither' },
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
    {
      id: 'Q_stomach_quality',
      prompt: 'What kind of pain is it?',
      simplePrompt: 'What does the pain feel like?',
      options: [
        { id: 'sharp', emoji: 'zap', text: 'Sharp or stabbing' },
        { id: 'crampy', emoji: 'ribbon', text: 'Cramping' },
        { id: 'burning', emoji: 'flame', text: 'Burning' },
        { id: 'dull', emoji: 'cloud', text: 'Dull or aching' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_stomach_aggravating',
      prompt: 'What makes the pain worse?',
      simplePrompt: 'When does the pain get worse?',
      options: [
        { id: 'eating', emoji: 'restaurant', text: 'After eating' },
        { id: 'movement', emoji: 'walk', text: 'With movement' },
        { id: 'pressing', emoji: 'finger-print', text: 'When I press on it' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_stomach_bowel',
      prompt: 'Any change in your bowel movements?',
      simplePrompt: 'Is your stomach doing anything different?',
      options: [
        { id: 'diarrhea', emoji: 'alert', text: 'Diarrhea' },
        { id: 'constipation', emoji: 'hourglass', text: 'Constipation' },
        { id: 'blood', emoji: 'warning', text: 'Blood in stool or vomit' },
        { id: 'none', emoji: 'thumbs-up', text: 'None of these' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_stomach_nausea',
      prompt: 'Are you feeling nauseous or have you vomited?',
      simplePrompt: 'Do you feel like throwing up?',
      options: [
        { id: 'nausea', emoji: 'meh', text: 'Just nausea' },
        { id: 'vomiting', emoji: 'poop', text: 'Vomiting' },
        { id: 'both_nausea_vomit', emoji: 'warning', text: 'Both nausea and vomiting' },
        { id: 'none', emoji: 'thumbs-up', text: 'None of these' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_chest_quality',
      prompt: 'What does the pain feel like?',
      simplePrompt: 'How would you describe the pain?',
      options: [
        { id: 'sharp', emoji: 'zap', text: 'Sharp or stabbing' },
        { id: 'pressure', emoji: 'resize', text: 'Pressure or tightness' },
        { id: 'burning', emoji: 'flame', text: 'Burning' },
        { id: 'crushing', emoji: 'warning', text: 'Crushing or heavy' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_chest_aggravating',
      prompt: 'Does anything make the pain worse?',
      simplePrompt: 'When does the chest pain get worse?',
      options: [
        { id: 'breathing_makes_worse', emoji: 'lungs', text: 'With breathing' },
        { id: 'movement', emoji: 'walk', text: 'With movement' },
        { id: 'exertion', emoji: 'barbell', text: 'With physical activity' },
        { id: 'lying_down', emoji: 'bed', text: 'When lying down' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_chest_history',
      prompt: 'Do you have any history of these conditions?',
      simplePrompt: 'Have you been told you have any of these?',
      options: [
        { id: 'heart', emoji: 'heart', text: 'Heart problem' },
        { id: 'hypertension', emoji: 'pulse', text: 'High blood pressure' },
        { id: 'diabetes', emoji: 'medical', text: 'Diabetes' },
        { id: 'none', emoji: 'thumbs-up', text: 'None' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_breath_cough',
      prompt: 'Is your cough dry or does it bring up mucus?',
      simplePrompt: 'Is your cough dry or wet?',
      options: [
        { id: 'dry', emoji: 'leaf', text: 'Dry cough' },
        { id: 'wet', emoji: 'water', text: 'With mucus or phlegm' },
        { id: 'both_cough', emoji: 'repeat', text: 'Both' },
        { id: 'no_cough', emoji: 'thumbs-up', text: 'No cough' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_breath_wheeze',
      prompt: 'Do you hear a wheezing or whistling sound when you breathe?',
      simplePrompt: 'Does your breathing make a whistling sound?',
      options: [
        { id: 'yes_wheeze', emoji: 'volume-high', text: 'Yes' },
        { id: 'no_wheeze', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_breath_swelling',
      prompt: 'Any swelling of your face, lips, or tongue?',
      simplePrompt: 'Is your face or lips swollen?',
      options: [
        { id: 'yes_swelling', emoji: 'warning', text: 'Yes, swelling of face or lips' },
        { id: 'no_swelling', emoji: 'thumbs-up', text: 'No' },
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
    {
      id: 'Q_head_location',
      prompt: 'Where exactly is the pain or discomfort?',
      simplePrompt: 'Where in your head does it hurt?',
      options: [
        { id: 'front', emoji: 'arrow-forward', text: 'Front of head' },
        { id: 'back', emoji: 'arrow-back', text: 'Back of head' },
        { id: 'one_side', emoji: 'arrow-left', text: 'One side only' },
        { id: 'all_over', emoji: 'globe', text: 'All over' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_head_quality',
      prompt: 'What type of pain is it?',
      simplePrompt: 'What does the pain feel like?',
      options: [
        { id: 'throbbing', emoji: 'pulse', text: 'Throbbing or pounding' },
        { id: 'pressure', emoji: 'resize', text: 'Pressure or tightness' },
        { id: 'sharp', emoji: 'zap', text: 'Sharp or stabbing' },
        { id: 'dull', emoji: 'cloud', text: 'Dull or aching' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_head_triggers',
      prompt: 'Does anything make it worse?',
      simplePrompt: 'What makes the pain worse?',
      options: [
        { id: 'light', emoji: 'sunny', text: 'Bright light' },
        { id: 'sound', emoji: 'volume-high', text: 'Loud sounds' },
        { id: 'movement', emoji: 'walk', text: 'Movement' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_head_neck',
      prompt: 'Do you have a stiff neck or fever too?',
      simplePrompt: 'Is your neck stiff or do you have a fever?',
      options: [
        { id: 'stiff_neck', emoji: 'alert', text: 'Stiff neck' },
        { id: 'fever_head', emoji: 'thermometer', text: 'Fever' },
        { id: 'both_stiff_fever', emoji: 'warning', text: 'Both' },
        { id: 'neither_head', emoji: 'thumbs-up', text: 'Neither' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_bone_location',
      prompt: 'Which part of your body is affected?',
      simplePrompt: 'Where does it hurt?',
      options: [
        { id: 'knee', emoji: 'body', text: 'Knee' },
        { id: 'back_bone', emoji: 'body', text: 'Back' },
        { id: 'shoulder', emoji: 'body', text: 'Shoulder' },
        { id: 'wrist', emoji: 'hand-left', text: 'Wrist or hand' },
        { id: 'hip', emoji: 'body', text: 'Hip' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_bone_movement',
      prompt: 'Can you move the affected area normally?',
      simplePrompt: 'Can you move it?',
      options: [
        { id: 'yes_move', emoji: 'thumbs-up', text: 'Yes, normally' },
        { id: 'limited', emoji: 'warning', text: 'Limited movement' },
        { id: 'cannot_move', emoji: 'close-circle', text: 'Cannot move it' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_bone_swelling',
      prompt: 'Is there swelling, bruising, or any deformity?',
      simplePrompt: 'Is the area swollen or bruised?',
      options: [
        { id: 'swelling_bone', emoji: 'resize', text: 'Swelling' },
        { id: 'bruising', emoji: 'color-palette', text: 'Bruising' },
        { id: 'deformity', emoji: 'warning', text: 'Deformity or misalignment' },
        { id: 'none_bone', emoji: 'thumbs-up', text: 'None' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_skin_spreading',
      prompt: 'Is the skin problem spreading or getting bigger?',
      simplePrompt: 'Is it getting bigger or spreading?',
      options: [
        { id: 'spreading', emoji: 'expand', text: 'Yes, it is spreading' },
        { id: 'stable', emoji: 'pause', text: 'Staying the same' },
        { id: 'shrinking', emoji: 'contract', text: 'Getting smaller' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_skin_sensation',
      prompt: 'Is it itchy, painful, or both?',
      simplePrompt: 'Does it itch, hurt, or both?',
      options: [
        { id: 'itchy_skin', emoji: 'finger-print', text: 'Itchy' },
        { id: 'painful_skin', emoji: 'flame', text: 'Painful' },
        { id: 'both_skin', emoji: 'repeat', text: 'Both itchy and painful' },
        { id: 'neither_skin', emoji: 'thumbs-up', text: 'Neither' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_skin_discharge',
      prompt: 'Is there any oozing or discharge from the area?',
      simplePrompt: 'Is anything leaking from the skin?',
      options: [
        { id: 'yes_discharge', emoji: 'water', text: 'Yes' },
        { id: 'no_discharge', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_ent_location',
      prompt: 'Which area is affected?',
      simplePrompt: 'Where is the problem?',
      options: [
        { id: 'ear', emoji: 'ear', text: 'Ear' },
        { id: 'nose', emoji: 'body', text: 'Nose' },
        { id: 'throat_ent', emoji: 'chatbubbles', text: 'Throat' },
        { id: 'multiple_ent', emoji: 'apps', text: 'More than one area' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_ent_hearing',
      prompt: 'Any hearing changes, ringing, or difficulty swallowing?',
      simplePrompt: 'Can you hear normally? Any trouble swallowing?',
      options: [
        { id: 'hearing_loss', emoji: 'volume-low', text: 'Hearing loss or ringing' },
        { id: 'difficulty_swallowing', emoji: 'alert', text: 'Difficulty swallowing' },
        { id: 'both_ent', emoji: 'warning', text: 'Both' },
        { id: 'neither_ent', emoji: 'thumbs-up', text: 'Neither' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_ent_discharge',
      prompt: 'Is there any discharge from your ear or nose?',
      simplePrompt: 'Is anything coming out of your ear or nose?',
      options: [
        { id: 'yes_discharge', emoji: 'water', text: 'Yes' },
        { id: 'no_discharge', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_women_cycle',
      prompt: 'Is this related to your menstrual cycle?',
      simplePrompt: 'Is this happening around your period?',
      options: [
        { id: 'before_period', emoji: 'time', text: 'Before my period' },
        { id: 'during_period', emoji: 'water', text: 'During my period' },
        { id: 'after_period', emoji: 'checkmark-circle', text: 'After my period' },
        { id: 'not_related', emoji: 'thumbs-up', text: 'Not related to my cycle' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_women_discharge',
      prompt: 'Any unusual vaginal discharge?',
      simplePrompt: 'Is there any unusual discharge?',
      options: [
        { id: 'yes_discharge', emoji: 'water', text: 'Yes' },
        { id: 'no_discharge', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_women_urination',
      prompt: 'Any pain or burning during urination?',
      simplePrompt: 'Does it hurt when you pee?',
      options: [
        { id: 'yes_urination', emoji: 'warning', text: 'Yes, pain or burning' },
        { id: 'no_urination', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
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
    {
      id: 'Q_child_eating',
      prompt: 'Is the child eating and drinking normally?',
      simplePrompt: 'Is the child eating and drinking?',
      options: [
        { id: 'yes_eating', emoji: 'thumbs-up', text: 'Yes, normally' },
        { id: 'reduced', emoji: 'warning', text: 'Eating or drinking less' },
        { id: 'refusing', emoji: 'close-circle', text: 'Refusing food or water' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_child_behavior',
      prompt: 'Any change in the child\'s behavior or activity?',
      simplePrompt: 'Is the child acting differently?',
      options: [
        { id: 'irritable', emoji: 'sad', text: 'Irritable or crying a lot' },
        { id: 'unusually_sleepy', emoji: 'moon', text: 'Unusually sleepy or lethargic' },
        { id: 'playful', emoji: 'happy', text: 'Normal and playful' },
        OPT_NOT_SURE,
      ],
    },
    {
      id: 'Q_child_rash',
      prompt: 'Does the child have any rash on the skin?',
      simplePrompt: 'Is there a rash on the child\'s skin?',
      options: [
        { id: 'yes_rash', emoji: 'warning', text: 'Yes' },
        { id: 'no_rash', emoji: 'thumbs-up', text: 'No' },
        OPT_NOT_SURE,
      ],
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