function firstSentences(text: string, max = 2): string {
  const parts = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  return parts.slice(0, max).join('. ') + (parts.length > max ? '.' : '');
}

export interface ExtractiveSummaryOut {
  ai_summary: {
    main_complaint: string;
    findings: string;
    diagnosis: string;
    treatment: string;
    follow_up: string;
  };
  model_used: string;
}

const SECTION_KEYS: { label: string; field: keyof ExtractiveSummaryOut['ai_summary'] }[] = [
  { label: 'follow-up', field: 'follow_up' },
  { label: 'followup', field: 'follow_up' },
  { label: 'treatment', field: 'treatment' },
  { label: 'prescription', field: 'treatment' },
  { label: 'diagnosis', field: 'diagnosis' },
  { label: 'observations', field: 'findings' },
  { label: 'symptoms', field: 'main_complaint' },
];

function trimValue(raw: string): string {
  return raw.trim().replace(/^[:-]+/, '').trim();
}

/**
 * Lightweight deterministic summarizer used when the transformer model is
 * not configured. Replaced seamlessly by the Python report agent when
 * REPORT_MODEL points to a BART/T5 model.
 */
export function extractiveSummary(reportText: string): ExtractiveSummaryOut {
  const out: ExtractiveSummaryOut['ai_summary'] = {
    main_complaint: '',
    findings: '',
    diagnosis: '',
    treatment: '',
    follow_up: '',
  };

  const lower = reportText.toLowerCase();
  const segments: { start: number; end: number; field: keyof ExtractiveSummaryOut['ai_summary'] }[] = [];

  SECTION_KEYS.forEach(({ label, field }, i) => {
    const idx = lower.indexOf(label + ':');
    if (idx < 0) return;
    const nextCandidates = SECTION_KEYS.slice(i + 1)
      .map((s) => lower.indexOf(s.label + ':'))
      .filter((n) => n > idx);
    const nextIdx = nextCandidates.length ? nextCandidates[0] : reportText.length;
    segments.push({ start: idx + label.length + 1, end: nextIdx, field });
  });

  if (segments.length === 0) {
    out.main_complaint = firstSentences(reportText, 3);
  } else {
    for (const seg of segments) {
      const value = trimValue(reportText.slice(seg.start, seg.end));
      if (value) out[seg.field] = value;
    }
  }

  return { ai_summary: out, model_used: 'extractive-heuristic-v1' };
}