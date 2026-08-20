import { Schema, model, InferSchemaType } from 'mongoose';

const scannedReportSchema = new Schema({
  scan_id: { type: String, required: true, unique: true, index: true },
  patient_id: { type: String, required: true, index: true },
  raw_text: { type: String, default: '' },
  ai_summary: { type: String, default: '' },
  source: { type: String, default: 'image' },
  created_at: { type: Date, default: Date.now },
});

export type ScannedReportType = InferSchemaType<typeof scannedReportSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const ScannedReport = model('ScannedReport', scannedReportSchema);