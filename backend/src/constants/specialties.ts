export interface Specialty {
  code: string;
  name: string;
  department: string;
  icon: string;
}

export const SPECIALTIES: Specialty[] = [
  { code: 'D001', name: 'General Physician', department: 'General Medicine', icon: 'user-md' },
  { code: 'D002', name: 'Cardiologist', department: 'Cardiology', icon: 'heart' },
  { code: 'D003', name: 'Orthopedic Specialist', department: 'Orthopedics', icon: 'bone' },
  { code: 'D004', name: 'Gynecologist', department: 'Gynecology', icon: 'female' },
  { code: 'D005', name: 'Neurologist', department: 'Neurology', icon: 'brain' },
  { code: 'D006', name: 'Dermatologist', department: 'Dermatology', icon: 'sun' },
  { code: 'D007', name: 'Pediatrician', department: 'Pediatrics', icon: 'baby' },
  { code: 'D008', name: 'ENT Specialist', department: 'ENT', icon: 'ear' },
  { code: 'D009', name: 'Pulmonologist', department: 'Pulmonology', icon: 'lungs' },
  { code: 'D010', name: 'Endocrinologist', department: 'Endocrinology', icon: 'flask' },
];

export const SPECIALTY_BY_CODE: Record<string, Specialty> = Object.fromEntries(
  SPECIALTIES.map((s) => [s.code, s]),
);