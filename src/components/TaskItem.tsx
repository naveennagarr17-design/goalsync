import { Check, Clock, Pencil, Repeat, Trash2 } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import { formatDateTime, formatShort, formatTime } from '../lib/dates';
import type { Task } from '../lib/types';

interface Props {
  task: Task;
  readOnly?: boolean;
  showDate?: boolean;
  onToggle?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export default function TaskItem({ task, readOnly, showDate, onToggle, onEdit, onDelete }: Props) {
  return (
    <li className={`task${task.completed ? ' done' : ''}`}>
      {readOnly ? (
        <span className={`box static${task.completed ? ' on' : ''}`} role="img" aria-label={task.completed ? 'Completed' : 'Pending'}>
          {task.completed && <Check size={16} strokeWidth={3} aria-hidden />}
        </span>
      ) : (
        <label className="check">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle?.(task)}
            aria-label={`${task.completed ? 'Mark as pending' : 'Mark as completed'}: ${task.title}`}
          />
          <span className="box" aria-hidden><Check size={16} strokeWidth={3} /></span>
        </label>
      )}
      <div className="task-body">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <CategoryBadge category={task.category} />
          {showDate && <span>{formatShort(task.task_date)}</span>}
          {task.task_time && <span className="inline"><Clock size={13} aria-hidden /> {formatTime(task.task_time)}</span>}
          {task.series_id && <span className="inline" title="Part of a daily repeat"><Repeat size={13} aria-hidden /><span className="sr-only">Repeats daily</span></span>}
          {task.completed && task.completed_at && <span className="done-at">Completed {formatDateTime(task.completed_at)}</span>}
        </span>
      </div>
      {!readOnly && (
        <div className="task-actions">
          <button className="icon-btn" onClick={() => onEdit?.(task)} aria-label={`Edit ${task.title}`}><Pencil size={17} /></button>
          <button className="icon-btn" onClick={() => onDelete?.(task)} aria-label={`Delete ${task.title}`}><Trash2 size={17} /></button>
        </div>
      )}
    </li>
  );
}
