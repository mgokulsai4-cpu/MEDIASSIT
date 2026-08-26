import { Request, Response } from 'express';
import { aiRecommendSlots } from '../services/aiClient.js';
import { listDoctors, getAvailability } from '../services/doctorService.js';
import { listDoctorQueue, AVG_CONSULT_MINUTES } from '../services/queueAgent.js';
import { latestPatientUrgency } from '../services/preconsultService.js';
import { getPatientForUser } from '../services/patientService.js';
import { addDaysIso } from '../utils/time.js';

export async function handleRecommendSlots(req: Request, res: Response) {
  const { urgency, recommended_specialties } = req.body as {
    urgency?: string;
    recommended_specialties?: { name: string; score: number }[];
  };

  let resolvedUrgency = urgency || '';
  if (!resolvedUrgency && req.user?.role === 'patient') {
    const patient = await getPatientForUser(req.user.user_id);
    if (patient) {
      resolvedUrgency = (await latestPatientUrgency(patient.patient_id)) || 'green';
    }
  }
  if (!resolvedUrgency) resolvedUrgency = 'green';

  const doctors = await listDoctors();
  const slots: {
    doctor_id: string;
    doctor_name: string;
    specialization: string;
    date: string;
    time: string;
    consultation_fee: number;
    rating: number;
    experience_years: number;
    estimated_wait_minutes: number;
  }[] = [];

  for (let offset = 0; offset < 3; offset += 1) {
    const date = addDaysIso(offset);
    for (const doctor of doctors.slice(0, 10)) {
      try {
        const avail = await getAvailability(doctor.doctor_id, date);
        if (avail.slots.length === 0) continue;

        const queue = await listDoctorQueue(doctor.doctor_id);
        const waitMinutes = queue.length * AVG_CONSULT_MINUTES;

        for (const time of avail.slots.slice(0, 4)) {
          slots.push({
            doctor_id: doctor.doctor_id,
            doctor_name: doctor.name,
            specialization: doctor.specialization,
            date,
            time,
            consultation_fee: doctor.consultation_fee,
            rating: doctor.rating,
            experience_years: doctor.experience ?? 0,
            estimated_wait_minutes: waitMinutes,
          });
        }
      } catch {
        continue;
      }
    }
  }

  try {
    const result = await aiRecommendSlots({
      urgency: resolvedUrgency,
      recommended_specialties: recommended_specialties || [],
      available_slots: slots,
    });
    res.json({
      success: true,
      data: { recommendations: result.recommendations ?? [], urgency: resolvedUrgency },
    });
  } catch {
    const fallback = [...slots]
      .sort(
        (a, b) =>
          b.rating * 10 +
          (b.experience_years ?? 0) * 2 -
          b.estimated_wait_minutes -
          (a.rating * 10 + (a.experience_years ?? 0) * 2 - a.estimated_wait_minutes) ||
          a.date.localeCompare(b.date),
      )
      .slice(0, 5);
    res.json({
      success: true,
      data: { recommendations: fallback, urgency: resolvedUrgency, fallback: true },
    });
  }
}
