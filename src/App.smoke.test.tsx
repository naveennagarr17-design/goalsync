// @vitest-environment jsdom
// Renders the real app against an in-memory fake database and clicks through the main flows.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFake, type FakeDb } from './test/fakeSupabase';
import { addDays, todayISO } from './lib/dates';
import type { Task } from './lib/types';

const today = todayISO();
const ALICE = 'alice-id';
const BOB = 'bob-id';
let db: FakeDb;

function t(id: string, owner: string, title: string, date: string, completed: boolean, category: Task['category'] = 'Study'): Task {
  return { id, owner_id: owner, title, category, task_date: date, task_time: null, completed, completed_at: completed ? new Date().toISOString() : null, series_id: null, created_at: `2026-01-01T00:00:0${id.length % 9}Z`, updated_at: '' };
}

vi.mock('./lib/supabase', async () => {
  const real = await vi.importActual<typeof import('./lib/supabase')>('./lib/supabase');
  return { ...real, isConfigured: true, get supabase() { return (globalThis as unknown as { __fake: unknown }).__fake; } };
});

beforeEach(() => {
  db = {
    me: ALICE,
    calls: [],
    profiles: [{ id: ALICE, display_name: 'Alice', theme_mode: 'light', accent_color: 'forest', created_at: '' }],
    tasks: [
      t('a1', ALICE, 'Read chapter 4', today, true),
      t('a2', ALICE, 'Go for a run', today, false, 'Fitness'),
      t('a3', ALICE, 'Old finished task', addDays(today, -1), true),
      t('b1', BOB, 'Bob private task title', today, true, 'Work'),
      t('b2', BOB, 'Bob second task', today, false, 'Work'),
    ],
    friendship: { id: 'f1', status: 'accepted', i_am_requester: true, other_id: BOB, other_name: 'Bobby', created_at: '', accepted_at: '2026-10-01T00:00:00Z' },
  };
  (globalThis as unknown as { __fake: unknown }).__fake = createFake(db);
  window.history.replaceState({}, '', '/');
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(() => cleanup());

async function renderApp() {
  const { AuthProvider } = await import('./context/AuthContext');
  const { ThemeProvider } = await import('./context/ThemeContext');
  const { ToastProvider } = await import('./context/ToastContext');
  const { default: App } = await import('./App');
  render(
    <ToastProvider><AuthProvider><ThemeProvider><App /></ThemeProvider></AuthProvider></ToastProvider>,
  );
}

describe('GoalSync UI (fake database)', () => {
  it('shows the dashboard with correct numbers and friend summary', async () => {
    await renderApp();
    expect(await screen.findByText(/Good (morning|afternoon|evening), Alice/)).toBeTruthy();
    expect(screen.getByText('Read chapter 4')).toBeTruthy();
    expect(screen.getByText('Go for a run')).toBeTruthy();
    // 3 tasks counted (2 today + 1 yesterday), 2 completed -> 67%
    expect(screen.getByRole('img', { name: '67 percent complete' })).toBeTruthy();
    expect(screen.getByText('Bobby’s progress')).toBeTruthy();
    // the friend's task titles never appear on my dashboard
    expect(screen.queryByText('Bob private task title')).toBeNull();
  });

  it('checking and unchecking a task saves it and updates progress', async () => {
    const user = userEvent.setup();
    await renderApp();
    const box = await screen.findByRole('checkbox', { name: /Mark as completed: Go for a run/ });
    await user.click(box);
    await waitFor(() => expect(db.tasks.find((x) => x.id === 'a2')?.completed).toBe(true));
    expect(db.tasks.find((x) => x.id === 'a2')?.completed_at).toBeTruthy();
    expect(await screen.findByRole('img', { name: '100 percent complete' })).toBeTruthy();
    await user.click(await screen.findByRole('checkbox', { name: /Mark as pending: Go for a run/ }));
    await waitFor(() => expect(db.tasks.find((x) => x.id === 'a2')?.completed).toBe(false));
    expect(db.tasks.find((x) => x.id === 'a2')?.completed_at).toBeNull();
  });

  it('adds a task through the form, validates the title, and repeats daily without duplicates', async () => {
    const user = userEvent.setup();
    await renderApp();
    await screen.findByText('Read chapter 4');
    await user.click(screen.getAllByRole('button', { name: /Add task/ })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }));
    expect(within(dialog).getByText('Enter a task title.')).toBeTruthy();
    await user.type(within(dialog).getByLabelText('Task title'), 'Drink water');
    await user.click(within(dialog).getByLabelText(/Repeat daily/));
    await user.click(within(dialog).getByRole('button', { name: /Add 30 tasks/ }));
    await waitFor(() => expect(db.tasks.filter((x) => x.title === 'Drink water')).toHaveLength(30));
    const dates = db.tasks.filter((x) => x.title === 'Drink water').map((x) => x.task_date).sort();
    expect(dates[0]).toBe(today);
    expect(dates[29]).toBe(addDays(today, 29));
    expect(new Set(db.tasks.filter((x) => x.title === 'Drink water').map((x) => x.series_id)).size).toBe(1);

    // Doing it again must not create copies
    await user.click(screen.getAllByRole('button', { name: /Add task/ })[0]);
    const again = await screen.findByRole('dialog');
    await user.type(within(again).getByLabelText('Task title'), 'drink water');
    await user.click(within(again).getByLabelText(/Repeat daily/));
    await user.click(within(again).getByRole('button', { name: /Add 30 tasks/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(db.tasks.filter((x) => x.title.toLowerCase() === 'drink water')).toHaveLength(30);
  });

  it('asks before deleting and deletes only after confirming', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(await screen.findByRole('button', { name: 'Delete Go for a run' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this task?')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(db.tasks.some((x) => x.id === 'a2')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Delete Go for a run' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete task' }));
    await waitFor(() => expect(db.tasks.some((x) => x.id === 'a2')).toBe(false));
  });

  it('past history shows yesterday by default and the right numbers', async () => {
    window.history.replaceState({}, '', '/history');
    await renderApp();
    expect(await screen.findByText('Old finished task')).toBeTruthy();
    expect(screen.queryByText('Read chapter 4')).toBeNull(); // today's task is not shown for yesterday
    expect(screen.getByText('Past day', { exact: false })).toBeTruthy();
  });

  it('friend view is read-only and shows the friend, not me', async () => {
    window.history.replaceState({}, '', '/friend');
    await renderApp();
    expect(await screen.findByText(/You are viewing Bobby’s progress/)).toBeTruthy();
    expect(await screen.findByText('Bob private task title')).toBeTruthy();
    expect(screen.queryByText('Read chapter 4')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Edit / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete / })).toBeNull();
  });

  it('analytics renders every chart section from the saved tasks', async () => {
    window.history.replaceState({}, '', '/analytics');
    await renderApp();
    expect(await screen.findByText('Completed vs pending, by day')).toBeTruthy();
    for (const title of ['Overall completion', 'Completion over time', 'Weekly progress', 'Monthly progress', 'By category', 'You vs Bobby', 'Range insights']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it('settings: colour theme and mode are saved to the profile and applied', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/settings');
    await renderApp();
    await user.click(await screen.findByRole('radio', { name: /Ocean Blue/ }));
    await waitFor(() => expect(db.profiles[0].accent_color).toBe('ocean'));
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#1d6fb8');
    await user.click(screen.getByRole('radio', { name: /^Dark/ }));
    await waitFor(() => expect(db.profiles[0].theme_mode).toBe('dark'));
    expect(document.documentElement.dataset.mode).toBe('dark');
    // privacy explanation is present
    expect(screen.getByText('Your friend can see')).toBeTruthy();
  });

  it('shows connect prompt when there is no friend', async () => {
    db.friendship = null;
    window.history.replaceState({}, '', '/friend');
    await renderApp();
    expect(await screen.findByText('You are not connected yet')).toBeTruthy();
  });
});
