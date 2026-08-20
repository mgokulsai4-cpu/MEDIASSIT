import { Schema, model, InferSchemaType } from 'mongoose';

const summarySchema = new Schema({
  summary_id: { type: String, required: true, unique: true, index: true },
  report_id: { type: String, required: true, index: true },
  ai_summary: { type: Schema.Types.Mixed },
  model_used: { type: String, default: '' },
  generated_at: { type: Date, default: Date.now },
});

export type ReportSummaryType = InferSchemaType<typeof summarySchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const ReportSummary = model('ReportSummary', summarySchema);