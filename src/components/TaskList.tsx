import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import TaskItem from './TaskItem';
import ConfirmDialog from './ConfirmDialog';
import { EmptyState } from './States';
import { useTaskModal } from './TaskModal';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Task } from '../lib/types';

interface Props {
  tasks: Task[];
  /** True for the friend's tasks: no checkbox, no edit, no delete. */
  readOnly?: boolean;
  showDate?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}

export default function TaskList({ tasks, readOnly, showDate, emptyTitle = 'No tasks', emptyHint }: Props) {
  const { toggleTask, deleteTask, deleteSeriesFrom } = useData();
  const { openEdit } = useTaskModal();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);

  async function onToggle(task: Task) {
    try {
      await toggleTask(task);
    } catch (e) {
      toast.show(`Could not update the task: ${(e as Error).message}`, 'error');
    }
  }

  async function confirmDelete(series: boolean) {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      if (series) await deleteSeriesFrom(pendingDelete);
      else await deleteTask(pendingDelete.id);
      toast.show(series ? 'Task and later repeats deleted' : 'Task deleted');
      setPendingDelete(null);
    } catch (e) {
      toast.show(`Could not delete: ${(e as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (tasks.length === 0) {
    return <EmptyState icon={<ListChecks size={26} />} title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <>
      <ul className="task-list">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} readOnly={readOnly} showDate={showDate} onToggle={onToggle} onEdit={openEdit} onDelete={setPendingDelete} />
        ))}
      </ul>
      {pendingDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message={`“${pendingDelete.title}” will be deleted for good. This cannot be undone.`}
          confirmLabel="Delete task"
          danger
          busy={busy}
          extra={pendingDelete.series_id ? { label: 'Delete this and later repeats', onClick: () => void confirmDelete(true) } : undefined}
          onConfirm={() => void confirmDelete(false)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
