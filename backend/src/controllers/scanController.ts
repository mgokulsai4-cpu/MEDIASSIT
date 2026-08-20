import { Request, Response } from 'express';
import { scanReportImage, listScannedReports, getScannedReport } from '../services/scanService.js';
import { Errors } from '../utils/ApiError.js';
import { getPatientForUser } from '../services/patientService.js';
import { canAccessPatient } from '../services/familyService.js';

export async function handleScanImage(req: Request, res: Response) {
  if (req.user!.role !== 'patient') throw Errors.forbidden('Only patients can scan reports');
  const { image_base64 } = req.body as { image_base64: string };
  if (!image_base64) throw Errors.badRequest('image_base64 is required');
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');
  const scan = await scanReportImage(patient.patient_id, image_base64);
  res.status(201).json({ success: true, data: scan });
}

export async function handleListScans(req: Request, res: Response) {
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');
  res.json({ success: true, data: await listScannedReports(patient.patient_id) });
}

export async function handleGetScan(req: Request, res: Response) {
  const scan = await getScannedReport(String(req.params.id));
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    const allowed = own && (own.patient_id === scan.patient_id || (await canAccessPatient(req.user!.user_id, scan.patient_id)));
    if (!allowed) throw Errors.forbidden();
  }
  res.json({ success: true, data: scan });
}