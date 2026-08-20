import type { Appointment, Doctor } from '../types';

export const fakeDoctors: Doctor[] = [
  {
    doctor_id: 'FAKE-DOC-001',
    user: { user_id: 'FAKE-USER-001', role: 'doctor', name: 'Dr. Aisha Mehta', email: 'fake.aisha@medassist.test' },
    specialty: 'General Physician',
    department: 'Primary Care',
    hospital: 'Fake City Care Hospital',
    experience_years: 12,
    is_available: true,
    avg_rating: 4.8,
  },
  {
    doctor_id: 'FAKE-DOC-002',
    user: { user_id: 'FAKE-USER-002', role: 'doctor', name: 'Dr. Arjun Rao', email: 'fake.arjun@medassist.test' },
    specialty: 'Cardiologist',
    department: 'Heart Health',
    hospital: 'Fake City Care Hospital',
    experience_years: 9,
    is_available: true,
    avg_rating: 4.7,
  },
];

export function createFakeAppointments(patientId: string): Appointment[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      appointment_id: 'FAKE-APPT-001',
      patient_id: patientId,
      doctor_id: 'FAKE-DOC-001',
      doctor_name: 'Dr. Aisha Mehta',
      date: today.toISOString(),
      time: '10:30 AM',
      hospital: 'Fake City Care Hospital',
      status: 'confirmed',
      reason: 'Routine health check',
      urgency: 'green',
      is_fake: true,
    },
    {
      appointment_id: 'FAKE-APPT-002',
      patient_id: patientId,
      doctor_id: 'FAKE-DOC-002',
      doctor_name: 'Dr. Arjun Rao',
      date: tomorrow.toISOString(),
      time: '02:00 PM',
      hospital: 'Fake City Care Hospital',
      status: 'pending',
      reason: 'Test booking flow',
      urgency: 'yellow',
      is_fake: true,
    },
  ];
}

export const fakeDoctorDashboard = {
  doctor_id: 'FAKE-DOC-001',
  doctor_name: 'Dr. Aisha Mehta',
  specialization: 'General Physician',
  today_appointments: [
    {
      appointment_id: 'FAKE-APPT-101',
      patient_id: 'FAKE-P001',
      patient_name: 'Riya Sharma',
      time: '09:30 AM',
      urgency: 'orange',
      status: 'scheduled',
      queue_position: '1',
      queue_status: 'waiting',
    },
    {
      appointment_id: 'FAKE-APPT-102',
      patient_id: 'FAKE-P002',
      patient_name: 'Kabir Singh',
      time: '10:15 AM',
      urgency: 'green',
      status: 'confirmed',
      queue_position: null,
      queue_status: null,
    },
    {
      appointment_id: 'FAKE-APPT-103',
      patient_id: 'FAKE-P003',
      patient_name: 'Maya Patel',
      time: '11:00 AM',
      urgency: 'yellow',
      status: 'confirmed',
      queue_position: '2',
      queue_status: 'waiting',
    },
  ],
  total_today: 3,
  queue_length: 2,
  urgency_breakdown: { red: 0, orange: 1, yellow: 1, green: 1 },
};

export const fakeDoctorQueue = [
  {
    queue_id: 'FAKE-Q-001', queue_token: 'Q01', appointment_id: 'FAKE-APPT-101', patient_id: 'FAKE-P001', patient: { name: 'Riya Sharma', age: 29 },
    appointment_time: '09:30 AM', position: 1, priority_score: 702, urgency: 'orange', status: 'waiting', waiting_time: 10, is_fake: true,
  },
  {
    queue_id: 'FAKE-Q-002', patient_id: 'FAKE-P003', patient: { name: 'Maya Patel', age: 44 },
    appointment_time: '11:00 AM', position: 2, priority_score: 306, urgency: 'yellow', status: 'waiting', waiting_time: 5, is_fake: true,
  },
  {
    queue_id: 'FAKE-Q-003', patient_id: 'FAKE-P004', patient: { name: 'Noah Thomas', age: 36 },
    appointment_time: '09:00 AM', position: 0, priority_score: 100, urgency: 'green', status: 'called', waiting_time: 0, is_fake: true,
  },
];

export const fakePatientSummary = {
  patient: {
    patient_id: 'FAKE-P001', name: 'Riya Sharma', age: 29, gender: 'female', blood_group: 'O+',
    existing_conditions: ['Mild asthma'], allergies: ['Dust'], medical_history: 'Uses inhaler as needed.',
  },
  preconsult_summary: {
    chief_complaint: 'Shortness of breath after exercise',
    medications: ['Salbutamol inhaler'],
    allergies: ['Dust'],
    medical_history: 'Mild asthma',
    lifestyle_notes: 'None reported',
    vital_signs: { temperature: 'Normal (below 37.5°C)' },
    clinical_summary: '29-year-old patient reports shortness of breath after exercise. Uses a salbutamol inhaler.',
    urgency: 'orange',
    symptoms: [{ duration: 'A few days', severity: 'moderate', associated: 'Worse with exertion' }],
  },
  urgency: 'orange',
  recent_reports: [{ report_id: 'FAKE-REPORT-001', diagnosis: 'Exercise-induced asthma', date: new Date().toISOString() }],
};

export const fakeDoctorReports = [
  { report_id: 'FAKE-REPORT-001', patient_id: 'FAKE-P001', doctor_diagnosis: 'Exercise-induced asthma', created_at: new Date().toISOString(), symptoms: ['Breathlessness', 'Chest tightness'], is_fake: true },
  { report_id: 'FAKE-REPORT-002', patient_id: 'FAKE-P003', doctor_diagnosis: 'Seasonal allergy symptoms', created_at: new Date(Date.now() - 86400000 * 3).toISOString(), symptoms: ['Sneezing', 'Itchy eyes'], is_fake: true },
];
