import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { friendlyError, supabase } from '../lib/supabase';
import { addDays, todayISO } from '../lib/dates';
import { sortTasks } from '../lib/stats';
import { uuid } from '../lib/uuid';
import type { Friendship, Task, TaskInput } from '../lib/types';

export const REPEAT_DAYS = 30; // "Repeat daily" creates the chosen date plus the next 29 days

interface AddResult { created: number; skipped: number }

interface DataValue {
  myTasks: Task[];
  friendTasks: Task[];
  friendship: Friendship | null;
  /** The friend, only when the connection is accepted. */
  friend: { id: string; name: string } | null;
  loading: boolean;
  error: string | null;
  today: string;
  reload: () => Promise<void>;
  addTask: (input: TaskInput, repeatDaily: boolean) => Promise<AddResult>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteSeriesFrom: (task: Task) => Promise<void>;
  sendFriendRequest: (email: string) => Promise<void>;
  respondToRequest: (id: string, accept: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

async function fetchAllTasks(ownerId: string): Promise<Task[]> {
  const pageSize = 1000; // Supabase returns at most 1000 rows per request, so we read page by page
  const all: Task[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', ownerId)
      .order('task_date')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...((data ?? []) as Task[]));
    if (!data || data.length < pageSize) break;
  }
  return sortTasks(all);
}

async function fetchFriendship(): Promise<Friendship | null> {
  const { data, error } = await supabase.rpc('get_friendship');
  if (error) throw error;
  const rows = (data ?? []) as Friendship[];
  return rows[0] ?? null;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [friendTasks, setFriendTasks] = useState<Task[]>([]);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO());
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async (showSpinner: boolean) => {
    if (!userId) return;
    if (showSpinner) setLoading(true);
    try {
      const [mine, link] = await Promise.all([fetchAllTasks(userId), fetchFriendship()]);
      const theirs = link?.status === 'accepted' ? await fetchAllTasks(link.other_id) : [];
      setMyTasks(mine);
      setFriendship(link);
      setFriendTasks(theirs);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const reload = useCallback(() => load(false), [load]);

  // Load when someone signs in; clear everything when they sign out (so the next person never sees stale data).
  useEffect(() => {
    if (!userId) {
      loadedFor.current = null;
      setMyTasks([]); setFriendTasks([]); setFriendship(null); setLoading(true); setError(null);
      return;
    }
    if (loadedFor.current !== userId) {
      loadedFor.current = userId;
      void load(true);
    }
  }, [userId, load]);

  // Refresh when the app comes back to the foreground, and roll "today" over at midnight.
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setToday(todayISO());
        void load(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => setToday((prev) => (todayISO() !== prev ? todayISO() : prev)), 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [userId, load]);

  const refreshMine = useCallback(async () => {
    if (!userId) return;
    setMyTasks(await fetchAllTasks(userId));
  }, [userId]);

  const addTask = useCallback(async (input: TaskInput, repeatDaily: boolean): Promise<AddResult> => {
    if (!userId) throw new Error('You are signed out.');
    const base = { owner_id: userId, title: input.title.trim(), category: input.category, task_time: input.task_time || null };
    const dates = repeatDaily ? Array.from({ length: REPEAT_DAYS }, (_, i) => addDays(input.task_date, i)) : [input.task_date];

    let toCreate = dates;
    if (repeatDaily) {
      // Skip days that already have a task with the same title, so running this twice never doubles up.
      const { data, error } = await supabase
        .from('tasks')
        .select('task_date,title')
        .eq('owner_id', userId)
        .gte('task_date', dates[0])
        .lte('task_date', dates[dates.length - 1]);
      if (error) throw new Error(friendlyError(error));
      const existing = new Set((data ?? []).map((r) => `${r.task_date}|${String(r.title).trim().toLowerCase()}`));
      toCreate = dates.filter((d) => !existing.has(`${d}|${base.title.toLowerCase()}`));
    }
    if (toCreate.length === 0) return { created: 0, skipped: dates.length };

    const seriesId = repeatDaily ? uuid() : null;
    const rows = toCreate.map((task_date) => ({ ...base, task_date, series_id: seriesId }));
    const { error } = await supabase.from('tasks').insert(rows);
    if (error) throw new Error(friendlyError(error));
    await refreshMine();
    return { created: rows.length, skipped: dates.length - rows.length };
  }, [userId, refreshMine]);

  const updateTask = useCallback(async (id: string, input: TaskInput) => {
    const { error } = await supabase
      .from('tasks')
      .update({ title: input.title.trim(), category: input.category, task_date: input.task_date, task_time: input.task_time || null })
      .eq('id', id);
    if (error) throw new Error(friendlyError(error));
    await refreshMine();
  }, [refreshMine]);

  const toggleTask = useCallback(async (task: Task) => {
    const next = !task.completed;
    // Show the change immediately, then confirm with the database (which sets the real completion time).
    setMyTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next, completed_at: next ? new Date().toISOString() : null } : t)));
    const { data, error } = await supabase.from('tasks').update({ completed: next }).eq('id', task.id).select().single();
    if (error) {
      setMyTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      throw new Error(friendlyError(error));
    }
    setMyTasks((prev) => prev.map((t) => (t.id === task.id ? (data as Task) : t)));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(friendlyError(error));
    setMyTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const deleteSeriesFrom = useCallback(async (task: Task) => {
    if (!task.series_id || !userId) return;
    const { error } = await supabase.from('tasks').delete().eq('owner_id', userId).eq('series_id', task.series_id).gte('task_date', task.task_date);
    if (error) throw new Error(friendlyError(error));
    await refreshMine();
  }, [userId, refreshMine]);

  const sendFriendRequest = useCallback(async (email: string) => {
    const { error } = await supabase.rpc('send_friend_request', { friend_email: email });
    if (error) throw new Error(friendlyError(error));
    await load(false);
  }, [load]);

  const respondToRequest = useCallback(async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_friend_request', { request_id: id, accept });
    if (error) throw new Error(friendlyError(error));
    await load(false);
  }, [load]);

  const disconnect = useCallback(async () => {
    if (!friendship) return;
    const { error } = await supabase.from('friendships').delete().eq('id', friendship.id);
    if (error) throw new Error(friendlyError(error));
    await load(false);
  }, [friendship, load]);

  const friend = useMemo(
    () => (friendship?.status === 'accepted' ? { id: friendship.other_id, name: friendship.other_name } : null),
    [friendship],
  );

  const value = useMemo<DataValue>(
    () => ({
      myTasks, friendTasks, friendship, friend, loading, error, today, reload,
      addTask, updateTask, toggleTask, deleteTask, deleteSeriesFrom, sendFriendRequest, respondToRequest, disconnect,
    }),
    [myTasks, friendTasks, friendship, friend, loading, error, today, reload, addTask, updateTask, toggleTask, deleteTask, deleteSeriesFrom, sendFriendRequest, respondToRequest, disconnect],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
