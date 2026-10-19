// All task dates are plain "YYYY-MM-DD" strings in the user's own calendar.
// We never use toISOString() for dates, because that converts to UTC and can
// shift a task to the wrong day.

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && toISODate(parseISODate(s)) === s;
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function addMonths(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toISODate(d);
}

export function startOfMonth(s: string): string {
  const d = parseISODate(s);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(s: string): string {
  const d = parseISODate(s);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Weeks start on Monday. */
export function startOfWeek(s: string): string {
  const d = parseISODate(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function daysBetween(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 6 rows x 7 columns of dates for a month view (Monday first). */
export function monthGrid(anyDayInMonth: string): string[][] {
  const first = startOfMonth(anyDayInMonth);
  let cursor = startOfWeek(first);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export function formatLong(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatMedium(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShort(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatMonthYear(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** "14:30:00" -> "2:30 PM" (uses the device's own 12/24 hour style). */
export function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
