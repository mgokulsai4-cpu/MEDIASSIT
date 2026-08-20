import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

/**
 * Generate sequential, human-friendly record ids such as A034, Q012, P007.
 */
export async function nextId(prefix: string, padTo = 3): Promise<string> {
  const doc = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  )
    .select('seq')
    .lean()
    .exec();
  const n = doc?.seq ?? 1;
  return `${prefix}${String(n).padStart(padTo, '0')}`;
}