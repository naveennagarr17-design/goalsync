import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDateTime } from '../lib/dates';
import type { TaskEvent } from '../lib/types';

const LABELS: Record<TaskEvent['event_type'], string> = {
  created: 'Added',
  completed: 'Completed',
  uncompleted: 'Marked pending again',
  deleted: 'Deleted',
};

/** The saved history of status changes for one day (your own tasks only). */
export default function ActivityLog({ date }: { date: string }) {
  const { user } = useAuth();
  const { myTasks } = useData(); // reload the log whenever a task changes
  const [events, setEvents] = useState<TaskEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('task_events')
      .select('*')
      .eq('owner_id', user.id)
      .eq('task_date', date)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        setFailed(!!error);
        setEvents((data ?? []) as TaskEvent[]);
      });
    return () => { cancelled = true; };
  }, [user, date, myTasks]);

  return (
    <details className="card log">
      <summary>Status history for this day{events ? ` (${events.length})` : ''}</summary>
      {failed && <p className="muted">The history could not be loaded.</p>}
      {events && events.length === 0 && !failed && <p className="muted">No changes recorded for this day yet.</p>}
      <ul className="log-list">
        {events?.map((e) => (
          <li key={e.id}>
            <span className={`log-kind log-${e.event_type}`}>{LABELS[e.event_type]}</span>
            <span className="log-title">{e.task_title}</span>
            <time className="muted">{formatDateTime(e.created_at)}</time>
          </li>
        ))}
      </ul>
    </details>
  );
}
