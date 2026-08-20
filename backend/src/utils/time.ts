/** Convert 24h 'HH:mm' to 12h display like '10:30 AM'. */
export function toDisplayTime(hhmm: string): string {
  if (hhmm.includes('AM') || hhmm.includes('PM')) return hhmm;
  const [hRaw, mRaw] = hhmm.split(':');
  let h = parseInt(hRaw, 10);
  if (Number.isNaN(h)) return hhmm;
  const m = mRaw ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return String(h).padStart(2, '0') + ':' + m + ' ' + period;
}

export function toMinutes(hhmm: string): number {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekdayName(dateIso: string | undefined): string {
  const d = dateIso ? new Date(dateIso + 'T00:00:00') : new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLong(dateIso: string): string {
  try {
    return new Date(dateIso + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateIso;
  }
}