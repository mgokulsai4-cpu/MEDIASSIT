import { createWorker } from 'tesseract.js';
import { ScannedReport } from '../models/ScannedReport.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';
import { logger } from '../utils/logger.js';
import { aiSummarizeReport } from './aiClient.js';

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;
let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    logger.info('Initializing tesseract OCR worker (first scan downloads language data)');
    workerPromise = createWorker('eng').catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function decodeImage(imageBase64: string): Buffer {
  const base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) throw Errors.badRequest('Image data is empty');
  if (buffer.length > 10 * 1024 * 1024) throw Errors.badRequest('Image too large (max 10MB)');
  return buffer;
}

export async function scanReportImage(patientId: string, imageBase64: string) {
  const buffer = decodeImage(imageBase64);
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  const text = (data.text ?? '').trim();
  if (text.length === 0) {
    throw Errors.badRequest('No readable text found in the image. Try a clearer photo.');
  }

  let summary = '';
  try {
    const result = await aiSummarizeReport({ report_text: text, doctor_diagnosis: '' });
    summary = typeof result.ai_summary === 'string' ? result.ai_summary : JSON.stringify(result.ai_summary);
  } catch (err) {
    logger.warn('Report scan summarize failed: ' + (err as Error).message);
  }

  const scan = await ScannedReport.create({
    scan_id: await nextId('SC'),
    patient_id: patientId,
    raw_text: text,
    ai_summary: summary,
  });
  logger.audit('report-scan', { scan_id: scan.scan_id, patient_id: patientId, chars: text.length });
  return scan;
}

export async function listScannedReports(patientId: string) {
  return ScannedReport.find({ patient_id: patientId }).sort({ created_at: -1 }).lean();
}

export async function getScannedReport(scanId: string) {
  const scan = await ScannedReport.findOne({ scan_id: scanId }).lean();
  if (!scan) throw Errors.notFound('Scanned report not found');
  return scan;
}