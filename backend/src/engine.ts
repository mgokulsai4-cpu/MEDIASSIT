type Answer = {
  key: string;
  answer: string;
};

type TriageInput = {
  messages: string[];
  answers?: Answer[];
};

type TriageOutput = {
  urgency: 'green' | 'yellow' | 'red';
  specialty: string;
  score: number;
  advice: string;
  possibleDiseases: string[];
};

// 🚨 Critical symptoms
const RED_FLAGS = new Set([
  'chest pain',
  'difficulty breathing',
  'unconscious',
  'severe bleeding',
  'stroke',
  'heart attack'
]);

// ⚡ Optimized scoring maps
const MODERATE = new Map([
  ['fever', 3],
  ['vomiting', 3],
  ['headache', 2],
  ['body pain', 2],
  ['infection', 3]
]);

const MILD = new Map([
  ['cold', 1],
  ['cough', 1],
  ['sore throat', 1],
  ['fatigue', 1]
]);

// 🧠 Disease prediction map
const DISEASE_MAP: Record<string, string[]> = {
  fever: ['Viral Fever', 'Dengue', 'Malaria'],
  headache: ['Migraine', 'Stress Headache'],
  cough: ['Common Cold', 'Bronchitis'],
  chest: ['Heart Disease', 'Angina'],
  vomiting: ['Food Poisoning', 'Gastritis']
};

// 🔍 Predict diseases
function predictDiseases(text: string): string[] {
  const found = new Set<string>();

  for (const symptom in DISEASE_MAP) {
    if (text.includes(symptom)) {
      DISEASE_MAP[symptom].forEach(d => found.add(d));
    }
  }

  return Array.from(found);
}

// 🧠 Specialty detection
function detectSpecialty(text: string): string {
  if (text.includes('chest') || text.includes('heart')) return 'Cardiology';
  if (text.includes('brain') || text.includes('headache')) return 'Neurology';
  if (text.includes('skin') || text.includes('rash')) return 'Dermatology';
  return 'General Medicine';
}

// 🚀 MAIN FUNCTION
export function runTriage(input: TriageInput): TriageOutput {
  const text = input.messages.join(' ').toLowerCase();
  const answers = input.answers || [];

  let score = 0;

  // 🚨 Immediate emergency
  for (const flag of RED_FLAGS) {
    if (text.includes(flag)) {
      return {
        urgency: 'red',
        specialty: detectSpecialty(text),
        score: 10,
        advice: 'Seek immediate medical attention',
        possibleDiseases: predictDiseases(text)
      };
    }
  }

  // ⚡ Optimized scoring
  for (const [symptom, value] of MODERATE) {
    if (text.includes(symptom)) score += value;
  }

  for (const [symptom, value] of MILD) {
    if (text.includes(symptom)) score += value;
  }

  // ⏱ Duration logic
  if (text.includes('day')) score += 2;
  if (text.includes('week')) score += 3;

  // 📋 Severity answers
  const severity = answers.find(a => a.key === 'severity')?.answer;

  if (severity === 'mild') score += 1;
  if (severity === 'moderate') score += 3;
  if (severity === 'severe') score += 5;

  // 🎯 Urgency decision
  let urgency: 'green' | 'yellow' | 'red' = 'green';
  let advice = 'Rest and monitor symptoms';

  if (score >= 4) {
    urgency = 'yellow';
    advice = 'Consult a doctor soon';
  }

  if (score >= 8) {
    urgency = 'red';
    advice = 'Seek urgent medical care';
  }

  return {
    urgency,
    specialty: detectSpecialty(text),
    score,
    advice,
    possibleDiseases: predictDiseases(text)
  };
}