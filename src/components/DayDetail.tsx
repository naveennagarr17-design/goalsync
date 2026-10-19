import { Plus } from 'lucide-react';
import TaskList from './TaskList';
import { useTaskModal } from './TaskModal';
import { formatLong } from '../lib/dates';
import { percentText, sortTasks, summarize } from '../lib/stats';
import type { Task } from '../lib/types';

interface Props {
  /** All tasks of the person being viewed. This component picks out the chosen day. */
  tasks: Task[];
  date: string;
  today: string;
  readOnly?: boolean;
  personName?: string;
}

export default function DayDetail({ tasks, date, today, readOnly, personName }: Props) {
  const { openAdd } = useTaskModal();
  const day = sortTasks(tasks.filter((t) => t.task_date === date));
  const s = summarize(day);
  const when = date === today ? 'Today' : date > today ? 'Upcoming' : 'Past day';

  return (
    <section className="card" aria-labelledby="day-heading">
      <div className="card-head">
        <div>
          <h2 id="day-heading">{formatLong(date)}</h2>
          <p className="muted">{personName ? `${personName}’s tasks` : 'Your tasks'} · {when}</p>
        </div>
        {!readOnly && (
          <button className="btn btn-secondary btn-sm" onClick={() => openAdd(date)}><Plus size={16} aria-hidden /> Add task for this day</button>
        )}
      </div>

      <div className="mini-stats">
        <div><strong>{s.total}</strong><span>Scheduled</span></div>
        <div><strong>{s.completed}</strong><span>Completed</span></div>
        <div><strong>{s.pending}</strong><span>Pending</span></div>
        <div><strong>{percentText(s.percent)}</strong><span>Completion</span></div>
      </div>
      <div className="bar" aria-hidden><div className="bar-fill" style={{ width: `${s.percent ?? 0}%` }} /></div>

      <TaskList
        tasks={day}
        readOnly={readOnly}
        emptyTitle="No tasks on this day"
        emptyHint={readOnly ? undefined : 'Use “Add task for this day” to record one.'}
      />
    </section>
  );
}
