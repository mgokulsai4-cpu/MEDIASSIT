export type UrgencyLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface TriageResult {
  symptoms: { name: string; category: string }[];
  duration: { label: string; days?: number };
  severity: { level: 'mild' | 'moderate' | 'severe'; label: string };
  urgency: { level: UrgencyLevel; label: string };
  recommended_specialties: {
    code: string;
    specialty: string;
    department: string;
    relevance: number;
  }[];
  emergency_flag: boolean;
  warning_signs: string[];
  reason: string;
  disclaimer: string;
}

export interface TriageQuestionOut {
  id: string;
  key: string;
  text: string;
  rephrased: boolean;
  options: { id: string; key: string; text: string; emoji: string }[];
}

export type ChatTurn =
  | { type: 'question'; question: TriageQuestionOut; done: boolean }
  | { type: 'result'; triage: TriageResult };

export interface AnswerInput {
  key: string;
  answer: string;
  rephrased?: boolean;
  from_text?: boolean;
}

export interface PatientContext {
  age?: number | null;
  gender?: string | null;
  existing_conditions?: string[];
}

export interface TriageChatInput {
  messages: { role: string; text: string }[];
  answers: AnswerInput[];
  patient?: PatientContext | null;
  simple?: boolean;
}