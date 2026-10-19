import { describe, expect, it } from 'vitest';
import type { Task } from './types';
import { addDays, addMonths, eachDay, isValidISODate, monthGrid, parseISODate, startOfWeek, toISODate } from './dates';
import { autoGranularity, categoryStats, currentStreak, rangeInsights, resolveRange, series, sortTasks, summarize } from './stats';

let n = 0;
function task(date: string, completed: boolean, extra: Partial<Task> = {}): Task {
  n++;
  return {
    id: `t${n}`, owner_id: 'u1', title: `Task ${n}`, category: 'Study', task_date: date, task_time: null,
    completed, completed_at: completed ? '2026-10-01T10:00:00Z' : null, series_id: null,
    created_at: `2026-01-01T00:00:${String(n % 60).padStart(2, '0')}Z`, updated_at: '2026-01-01T00:00:00Z', ...extra,
  };
}

describe('dates', () => {
  it('keeps calendar days stable (no UTC shift)', () => {
    expect(toISODate(parseISODate('2026-03-08'))).toBe('2026-03-08');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('handles months and weeks', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12'); // Sunday -> previous Monday
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(eachDay('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('nope')).toBe(false);
  });
  it('builds a 6x7 month grid starting Monday', () => {
    const grid = monthGrid('2026-10-18');
    expect(grid).toHaveLength(6);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2026-09-28');
    expect(grid.flat()).toContain('2026-10-31');
  });
});

describe('summarize', () => {
  it('computes completion percentage', () => {
    const s = summarize([...Array(40)].map(() => task('2026-10-01', true)).concat([...Array(10)].map(() => task('2026-10-01', false))));
    expect(s).toEqual({ total: 50, completed: 40, pending: 10, percent: 80 });
  });
  it('returns null (not 0%) when there are no tasks', () => {
    expect(summarize([]).percent).toBeNull();
  });
});

describe('currentStreak', () => {
  const today = '2026-10-18';
  it('counts perfect days ending today', () => {
    const tasks = [task('2026-10-18', true), task('2026-10-17', true), task('2026-10-16', true), task('2026-10-15', false)];
    expect(currentStreak(tasks, today)).toBe(3);
  });
  it('does not break the streak while today is still unfinished', () => {
    const tasks = [task('2026-10-18', true), task('2026-10-18', false), task('2026-10-17', true), task('2026-10-16', true)];
    expect(currentStreak(tasks, today)).toBe(2);
  });
  it('a day with a missed task breaks the streak', () => {
    const tasks = [task('2026-10-17', true), task('2026-10-16', true), task('2026-10-16', false), task('2026-10-15', true)];
    expect(currentStreak(tasks, today)).toBe(1);
  });
  it('a day with no tasks breaks the streak', () => {
    expect(currentStreak([task('2026-10-17', true), task('2026-10-15', true)], today)).toBe(1);
    expect(currentStreak([], today)).toBe(0);
  });
  it('ignores future tasks', () => {
    expect(currentStreak([task('2026-10-19', true)], today)).toBe(0);
  });
});

describe('resolveRange', () => {
  const today = '2026-10-18';
  const tasks = [task('2026-08-03', true), task('2026-10-25', false)];
  it('all time starts at the earliest task and ends today', () => {
    const r = resolveRange('all', today, tasks);
    expect(r.from).toBe('2026-08-03');
    expect(r.to).toBe(today);
  });
  it('last 7 and 30 days include today', () => {
    expect(resolveRange('7d', today, []).from).toBe('2026-10-12');
    expect(resolveRange('30d', today, []).from).toBe('2026-09-19');
  });
  it('previous month covers the whole month', () => {
    const r = resolveRange('prevMonth', today, []);
    expect([r.from, r.to]).toEqual(['2026-09-01', '2026-09-30']);
  });
  it('never extends past today and flags it', () => {
    const r = resolveRange('custom', today, [], { from: '2026-10-10', to: '2026-12-31' });
    expect(r.to).toBe(today);
    expect(r.cappedAtToday).toBe(true);
  });
  it('is empty when the range starts in the future', () => {
    expect(resolveRange('custom', today, [], { from: '2026-11-01', to: '2026-11-05' }).empty).toBe(true);
  });
});

describe('series and insights', () => {
  it('fills empty days and groups by week', () => {
    const tasks = [task('2026-10-12', true), task('2026-10-14', false), task('2026-10-19', true)];
    const days = series(tasks, '2026-10-12', '2026-10-14', 'day');
    expect(days.map((d) => d.total)).toEqual([1, 0, 1]);
    expect(days[1].percent).toBeNull();
    const weeks = series(tasks, '2026-10-12', '2026-10-25', 'week');
    expect(weeks.map((w) => [w.completed, w.pending])).toEqual([[1, 1], [1, 0]]);
  });
  it('chooses a sensible granularity', () => {
    expect(autoGranularity('2026-10-01', '2026-10-18')).toBe('day');
    expect(autoGranularity('2026-08-01', '2026-10-18')).toBe('week');
    expect(autoGranularity('2025-01-01', '2026-10-18')).toBe('month');
  });
  it('computes category stats and insights', () => {
    const tasks = [task('2026-10-01', true, { category: 'Health' }), task('2026-10-01', false, { category: 'Health' }), task('2026-10-02', true)];
    const cats = categoryStats(tasks);
    expect(cats.find((c) => c.category === 'Health')).toMatchObject({ total: 2, completed: 1, percent: 50 });
    expect(cats.find((c) => c.category === 'Work')?.percent).toBeNull();
    expect(rangeInsights(tasks)).toMatchObject({ activeDays: 2, perfectDays: 1, averageDaily: 75, bestDay: { date: '2026-10-02', percent: 100 } });
  });
  it('sorts timed tasks first', () => {
    const a = task('2026-10-01', false);
    const b = task('2026-10-01', false, { task_time: '09:00:00' });
    const c = task('2026-10-01', false, { task_time: '08:00:00' });
    expect(sortTasks([a, b, c]).map((t) => t.id)).toEqual([c.id, b.id, a.id]);
  });
});
