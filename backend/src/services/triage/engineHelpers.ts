import { Category, CATEGORY_SPECIALTY_SCORES } from './lexicon.js';
import { SPECIALTY_BY_CODE } from '../../constants/specialties.js';
import { PatientContext, TriageResult } from './engineTypes.js';

function wordList(texts: string[]): string {
  return ' ' + texts.join(' ').toLowerCase() + ' ';
}

function hasWord(haystack: string, word: string): boolean {
  return haystack.includes(' ' + word) || haystack.includes(' ' + word + '.') || haystack.includes(' ' + word + ',');
}

export function computeWarnSigns(
  cats: Category[],
  assoc: Set<string>,
  texts: string[],
  sevIn: string | undefined,
): string[] {
  const t = wordList(texts);
  const signs: string[] = [];

  if (cats.includes('chest') && (assoc.has('sweating') || assoc.has('arm_jaw') || assoc.has('breathing'))) {
    signs.push('Chest pain together with sweating, pain in the arm or jaw, or trouble breathing may point to a heart problem.');
  }
  if (cats.includes('chest') && hasWord(t, 'sweating')) {
    signs.push('Chest pain together with sweating may point to a heart problem.');
  }
  if (cats.includes('breathing') && (assoc.has('rest') || assoc.has('sleep'))) {
    signs.push('Breathing difficulty while at rest or while sleeping needs immediate attention.');
  }
  if (cats.includes('head') && (assoc.has('vision') || assoc.has('weak'))) {
    signs.push('Sudden vision change or weakness/numbness on one side may be a sign of stroke.');
  }
  if (hasWord(t, 'seizure') || hasWord(t, 'convulsion') || hasWord(t, 'fainted') || hasWord(t, 'unconscious')) {
    signs.push('Seizure, fainting or loss of consciousness requires urgent care.');
  }
  if (cats.includes('bone') && assoc.has('fall') && sevIn === 'severe') {
    signs.push('An injury with severe pain may need urgent examination.');
  }
  if (hasWord(t, 'bleeding') && sevIn === 'severe') {
    signs.push('Bleeding that is not stopping needs urgent care.');
  }
  return signs;
}

export function computeSpecialties(
  cats: Category[],
  patient: PatientContext | null | undefined,
): TriageResult['recommended_specialties'] {
  const scores: Record<string, number> = {};
  for (const cat of cats) {
    const row = CATEGORY_SPECIALTY_SCORES[cat] ?? {};
    for (const [code, score] of Object.entries(row)) {
      scores[code] = (scores[code] ?? 0) + score;
    }
  }

  const age = patient?.age;
  const conditions = (patient?.existing_conditions ?? []).map((c) => c.toLowerCase());
  if (age !== undefined && age !== null) {
    if (age < 18) scores.D007 = (scores.D007 ?? 0) + 6;
    if (age >= 60) scores.D001 = (scores.D001 ?? 0) + 3;
  }
  for (const c of conditions) {
    if (c.includes('heart') || c.includes('hypertension') || c.includes('blood pressure') || c.includes('bp')) {
      scores.D002 = (scores.D002 ?? 0) + 4;
      scores.D001 = (scores.D001 ?? 0) + 2;
    }
    if (c.includes('diabet')) {
      scores.D010 = (scores.D010 ?? 0) + 4;
      scores.D001 = (scores.D001 ?? 0) + 2;
    }
    if (c.includes('asthma') || c.includes('lung')) {
      scores.D009 = (scores.D009 ?? 0) + 4;
    }
  }

  if (cats.length === 0) scores.D001 = (scores.D001 ?? 0) + 8;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxScore = sorted.length ? sorted[0][1] : 1;
  return sorted.map(([code, sc]) => ({
    code,
    specialty: SPECIALTY_BY_CODE[code]?.name ?? code,
    department: SPECIALTY_BY_CODE[code]?.department ?? '',
    relevance: Math.round((sc / maxScore) * 100) / 100,
  }));
}