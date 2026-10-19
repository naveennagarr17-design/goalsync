import type { Category, Task } from './types';
import { CATEGORIES } from './types';
import {
  addDays, addMonths, daysBetween, endOfMonth, formatMedium, formatShort, maxDate, minDate, parseISODate,
  startOfMonth, startOfWeek,
} from './dates';

// ---------------------------------------------------------------------
// DEFINITIONS used everywhere in the app
//   Completion % = completed tasks / total tasks in the date range x 100,
//                  rounded to a whole number. No tasks = no percentage (null).
//   Tasks dated AFTER today are never counted in progress numbers. They are
//   "upcoming", so scheduling ahead does not make your percentage drop.
//   A "perfect day" has at least one task and every task is completed.
//   Current streak = number of perfect days in a row ending today. If today
//   is not perfect yet, the streak continues from yesterday (today only
//   breaks it once it is over). A day with no tasks breaks the streak.
// ---------------------------------------------------------------------

export interface Summary { total: number; completed: number; pending: number; percent: number | null }

export function summarize(tasks: Task[]): Summary {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  return { total, completed, pending: total - completed, percent: total === 0 ? null : Math.round((completed / total) * 100) };
}

export function percentText(p: number | null): string {
  return p === null ? '–' : `${p}%`;
}

export function inRange(tasks: Task[], from: string, to: string): Task[] {
  return tasks.filter((t) => t.task_date >= from && t.task_date <= to);
}

export function groupByDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = map.get(t.task_date);
    if (list) list.push(t);
    else map.set(t.task_date, [t]);
  }
  return map;
}

/** Timed tasks first (earliest first), then tasks without a time in the order they were added. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.task_date !== b.task_date) return a.task_date < b.task_date ? -1 : 1;
    if (a.task_time && b.task_time) return a.task_time < b.task_time ? -1 : a.task_time > b.task_time ? 1 : 0;
    if (a.task_time) return -1;
    if (b.task_time) return 1;
    return a.created_at < b.created_at ? -1 : 1;
  });
}

export function currentStreak(tasks: Task[], today: string): number {
  const byDate = groupByDate(tasks);
  const perfect = (d: string) => {
    const list = byDate.get(d);
    return !!list && list.length > 0 && list.every((t) => t.completed);
  };
  let cursor = perfect(today) ? today : addDays(today, -1);
  let n = 0;
  while (perfect(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// ---------------------------------------------------------------------
// Date ranges and filters
// ---------------------------------------------------------------------
export type RangePreset = 'all' | '7d' | '30d' | 'week' | 'month' | 'prevMonth' | 'custom';

export const PRESET_LABELS: Record<RangePreset, string> = {
  all: 'All time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  week: 'This week',
  month: 'This month',
  prevMonth: 'Last month',
  custom: 'Custom',
};

export interface DateRange { from: string; to: string; label: string; empty: boolean; cappedAtToday: boolean }

export function resolveRange(
  preset: RangePreset,
  today: string,
  tasks: Task[],
  custom?: { from: string; to: string },
): DateRange {
  let from = today;
  let to = today;
  switch (preset) {
    case 'all': {
      from = tasks.length ? tasks.reduce((min, t) => (t.task_date < min ? t.task_date : min), tasks[0].task_date) : today;
      break;
    }
    case '7d': from = addDays(today, -6); break;
    case '30d': from = addDays(today, -29); break;
    case 'week': from = startOfWeek(today); break;
    case 'month': from = startOfMonth(today); break;
    case 'prevMonth': {
      const prev = addMonths(today, -1);
      from = startOfMonth(prev);
      to = endOfMonth(prev);
      break;
    }
    case 'custom': {
      from = custom?.from || today;
      to = custom?.to || today;
      break;
    }
  }
  const requestedTo = to;
  to = minDate(to, today); // never count tasks after today
  const empty = from > to;
  const capped = requestedTo > today;
  const label = empty ? 'No days to show in this range yet' : from === to ? formatMedium(from) : `${formatMedium(from)} to ${formatMedium(to)}`;
  return { from, to, label, empty, cappedAtToday: capped };
}

// ---------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------
export type Granularity = 'day' | 'week' | 'month';

export interface SeriesPoint {
  key: string;
  label: string;
  completed: number;
  pending: number;
  total: number;
  percent: number | null;
}

function bucketStart(date: string, g: Granularity): string {
  if (g === 'day') return date;
  if (g === 'week') return startOfWeek(date);
  return startOfMonth(date);
}

function bucketLabel(key: string, g: Granularity): string {
  if (g === 'day') return formatShort(key);
  if (g === 'week') return formatShort(key);
  return parseISODate(key).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** One point per day/week/month between from and to (including empty ones). */
export function series(tasks: Task[], from: string, to: string, g: Granularity): SeriesPoint[] {
  if (from > to) return [];
  const keys: string[] = [];
  let cursor = bucketStart(from, g);
  while (cursor <= to) {
    keys.push(cursor);
    cursor = g === 'day' ? addDays(cursor, 1) : g === 'week' ? addDays(cursor, 7) : addMonths(cursor, 1);
  }
  const counts = new Map<string, { completed: number; total: number }>(keys.map((k) => [k, { completed: 0, total: 0 }]));
  for (const t of tasks) {
    if (t.task_date < from || t.task_date > to) continue;
    const bucket = counts.get(bucketStart(t.task_date, g));
    if (!bucket) continue;
    bucket.total++;
    if (t.completed) bucket.completed++;
  }
  return keys.map((key) => {
    const c = counts.get(key)!;
    return {
      key,
      label: bucketLabel(key, g),
      completed: c.completed,
      pending: c.total - c.completed,
      total: c.total,
      percent: c.total === 0 ? null : Math.round((c.completed / c.total) * 100),
    };
  });
}

/** Picks day / week / month so a chart never has too many points. */
export function autoGranularity(from: string, to: string): Granularity {
  const days = daysBetween(from, to) + 1;
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

export interface CategoryStat extends Summary { category: Category }

export function categoryStats(tasks: Task[]): CategoryStat[] {
  return CATEGORIES.map((category) => ({ category, ...summarize(tasks.filter((t) => t.category === category)) }));
}

export interface RangeInsights {
  activeDays: number;
  perfectDays: number;
  averageDaily: number | null;
  bestDay: { date: string; percent: number; total: number } | null;
}

export function rangeInsights(tasks: Task[]): RangeInsights {
  const byDate = groupByDate(tasks);
  let perfect = 0;
  let sum = 0;
  let best: RangeInsights['bestDay'] = null;
  for (const [date, list] of byDate) {
    const s = summarize(list);
    sum += s.percent ?? 0;
    if (s.pending === 0) perfect++;
    if (s.percent !== null && (!best || s.percent > best.percent || (s.percent === best.percent && s.total > best.total) || (s.percent === best.percent && s.total === best.total && date > best.date))) {
      best = { date, percent: s.percent, total: s.total };
    }
  }
  return {
    activeDays: byDate.size,
    perfectDays: perfect,
    averageDaily: byDate.size === 0 ? null : Math.round(sum / byDate.size),
    bestDay: best,
  };
}

export { maxDate };
