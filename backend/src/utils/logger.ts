const SENSITIVE_KEY = /password|passwd|secret|authorization|access_token|refresh_token|push_token|expo_pushtoken/i;

function safe(value: unknown): string {
  if (typeof value !== 'string') {
    try {
      return JSON.stringify(value, (key: string, v: unknown) => (SENSITIVE_KEY.test(key) ? '***' : v));
    } catch {
      return String(value);
    }
  }
  return value.replace(/(password|passwd|secret|token|authorization)[ =:]+["']?[^"',&} ]+/gi, '$1=***');
}

function write(level: string, args: unknown[]): void {
  const line = args.map((a) => safe(a)).join(' ');
  const fn: (msg?: string) => void = level === 'ERROR' ? console.error : console.log;
  fn(new Date().toISOString() + ' ' + level + ' ' + line);
}

export const logger = {
  info: (...args: unknown[]) => write('INFO', args),
  warn: (...args: unknown[]) => write('WARN', args),
  error: (...args: unknown[]) => write('ERROR', args),
  /** Audit-friendly log line (no PII, no tokens). */
  audit: (action: string, meta?: Record<string, unknown>) =>
    write('AUDIT', [action, meta ?? {}]),
};