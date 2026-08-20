import { Schema, model, InferSchemaType } from 'mongoose';

const familyLinkSchema = new Schema({
  link_id: { type: String, required: true, unique: true, index: true },
  guardian_user_id: { type: String, required: true, index: true },
  member_user_id: { type: String, required: true, index: true },
  relation: {
    type: String,
    enum: ['parent', 'child', 'spouse', 'sibling', 'other'],
    default: 'other',
  },
  created_at: { type: Date, default: Date.now },
});

familyLinkSchema.index({ guardian_user_id: 1, member_user_id: 1 }, { unique: true });

export type FamilyLinkType = InferSchemaType<typeof familyLinkSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const FamilyLink = model('FamilyLink', familyLinkSchema);