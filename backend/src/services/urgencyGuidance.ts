export type UrgencyLevel = 'red' | 'orange' | 'yellow' | 'green';

export const URGENCY_GUIDANCE: Record<UrgencyLevel, { label: string; action: string }> = {
  red: {
    label: 'Emergency',
    action: 'See this patient first. AI pre-consult flagged possible emergency signs.',
  },
  orange: {
    label: 'Urgent',
    action: 'Prioritize soon. Pre-consult found symptoms that may worsen without timely care.',
  },
  yellow: {
    label: 'Soon',
    action: 'Keep ahead of routine visits. Moderate severity from the AI interview.',
  },
  green: {
    label: 'Routine',
    action: 'Standard queue order. Low-risk from the AI pre-consultation.',
  },
};

export function guidanceFor(level?: string) {
  if (level === 'red' || level === 'orange' || level === 'yellow' || level === 'green') {
    return { level, ...URGENCY_GUIDANCE[level] };
  }
  return { level: 'green', ...URGENCY_GUIDANCE.green };
}

export function allUrgencyGuidance() {
  return (Object.keys(URGENCY_GUIDANCE) as UrgencyLevel[]).map((level) => ({
    level,
    ...URGENCY_GUIDANCE[level],
  }));
}
