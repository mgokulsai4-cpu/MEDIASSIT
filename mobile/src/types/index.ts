export interface User {
  user_id: string;
  role: 'patient' | 'doctor';
  name: string;
  email: string;
  phone?: string;
}

export interface Patient extends User {
  age?: number;
  gender?: string;
  existing_conditions?: string[];
}

export interface Doctor {
  user: User;
  doctor_id: string;
  specialty: string;
  department: string;
  hospital?: string;
  experience_years: number;
  is_available: boolean;
  avg_rating?: number;
}

export interface Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string;
  date: string;
  time: string;
  hospital?: string;
  status: 'pending' | 'scheduled' | 'confirmed' | 'in_queue' | 'in_consultation' | 'cancelled' | 'completed' | 'no_show';
  reason?: string;
  urgency?: 'green' | 'yellow' | 'orange' | 'red';
  is_fake?: boolean;
}

export interface UrgencyGuidance {
  level: string;
  label: string;
  action: string;
}

export interface QueueEntry {
  queue_id: string;
  queue_token?: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  position?: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'cancelled';
  estimated_wait_minutes?: number;
  waiting_time?: number;
  urgency?: string;
  priority_guidance?: UrgencyGuidance;
  appointment_time?: string;
  appointment_date?: string;
  appointment?: { time?: string; date?: string } | null;
}

export interface MedicalReport {
  report_id: string;
  patient_id: string;
  doctor_id: string;
  date?: string;
  created_at?: string;
  symptoms?: string | string[];
  clinical_observations?: string;
  doctor_diagnosis?: string;
  treatment?: string;
  prescription?: string;
  follow_up?: string;
}

export interface TriageQuestion {
  type: 'question';
  question: {
    id: string;
    key: string;
    text: string;
    rephrased: boolean;
    options: { id: string; key: string; text: string; emoji: string }[];
  };
  done: boolean;
}

export interface TriageResult {
  type: 'result';
  triage: {
    symptoms: { name: string; category: string }[];
    duration: { label: string; days?: number };
    severity: { level: string; label: string };
    urgency: { level: string; label: string };
    recommended_specialties: { code: string; specialty: string; department: string; relevance: number }[];
    emergency_flag: boolean;
    warning_signs: string[];
    reason: string;
    disclaimer: string;
  };
}

export type ChatTurn = TriageQuestion | TriageResult;

export interface PreConsultSummary {
  pc_id?: string;
  appointment_id?: string;
  chief_complaint: string;
  symptoms: { duration: string; severity: string; associated?: string }[];
  medications: string[];
  allergies: string[];
  medical_history: string;
  lifestyle_notes: string;
  vital_signs: Record<string, string>;
  triage_context: Record<string, unknown>;
  clinical_summary?: string;
  urgency?: string;
  status?: 'in_progress' | 'completed';
}

export interface AppNotification {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface SlotRecommendation {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  date: string;
  time: string;
  estimated_wait_minutes: number;
  score?: number;
  reason?: string;
  rating?: number;
  experience_years?: number;
}

export interface DoctorDashboardData {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  today_appointments: {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    time: string;
    urgency: string;
    status: string;
    queue_position: string | null;
    queue_status: string | null;
    preconsult_status?: string | null;
    chief_complaint?: string;
    urgency_guidance?: UrgencyGuidance;
  }[];
  total_today: number;
  queue_length: number;
  urgency_breakdown: { red: number; orange: number; yellow: number; green: number };
  urgency_guidance?: UrgencyGuidance[];
}

export interface DiagnosisAssist {
  difficulty: 'routine' | 'complex' | string;
  diagnoses: { name: string; confidence?: number; rationale?: string }[];
  prescription?: { drug: string; dose?: string; notes?: string }[];
  assist_points?: string[];
  red_flags?: string[];
  reasoning?: string;
  disclaimer?: string;
  generated_at?: string;
  model_used?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface Prescription {
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  medications: Medication[];
  instructions?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
  created_at?: string;
  doctor?: { doctor_id: string; name: string; specialization: string } | null;
}

export interface TimelineEntry {
  type: 'appointment' | 'report' | 'prescription' | 'preconsult' | 'triage';
  id: string;
  date: string;
  title: string;
  subtitle: string;
  doctor_name?: string;
  status?: string;
  link: string;
}

export interface FamilyMember {
  link_id: string;
  relation: string;
  user: { user_id: string; name: string; email: string; phone?: string };
  patient: { patient_id: string; name: string; age?: number | null; gender?: string } | null;
  created_at: string;
}

export interface ScannedReport {
  scan_id: string;
  patient_id: string;
  raw_text: string;
  ai_summary: string;
  source: string;
  created_at: string;
}
