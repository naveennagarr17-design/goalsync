import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Modal from './Modal';
import { useData, REPEAT_DAYS } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { isValidISODate } from '../lib/dates';
import { CATEGORIES, type Category, type Task } from '../lib/types';

interface ModalApi {
  openAdd: (date?: string) => void;
  openEdit: (task: Task) => void;
}

const TaskModalContext = createContext<ModalApi | null>(null);

type State = { mode: 'add'; date: string | undefined } | { mode: 'edit'; task: Task };

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const api = useMemo<ModalApi>(() => ({
    openAdd: (date) => setState({ mode: 'add', date }),
    openEdit: (task) => setState({ mode: 'edit', task }),
  }), []);
  const close = useCallback(() => setState(null), []);

  return (
    <TaskModalContext.Provider value={api}>
      {children}
      {state && <TaskForm state={state} onClose={close} />}
    </TaskModalContext.Provider>
  );
}

export function useTaskModal(): ModalApi {
  const ctx = useContext(TaskModalContext);
  if (!ctx) throw new Error('useTaskModal must be used inside TaskModalProvider');
  return ctx;
}

function TaskForm({ state, onClose }: { state: State; onClose: () => void }) {
  const { addTask, updateTask, today } = useData();
  const toast = useToast();
  const editing = state.mode === 'edit' ? state.task : null;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState<Category>(editing?.category ?? 'Personal');
  const [date, setDate] = useState(editing?.task_date ?? (state.mode === 'add' && state.date ? state.date : today));
  const [time, setTime] = useState(editing?.task_time?.slice(0, 5) ?? '');
  const [repeat, setRepeat] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Enter a task title.';
    else if (title.trim().length > 200) next.title = 'Keep the title under 200 characters.';
    if (!date || !isValidISODate(date)) next.date = 'Choose a valid date.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const input = { title, category, task_date: date, task_time: time || null };
      if (editing) {
        await updateTask(editing.id, input);
        toast.show('Task updated');
      } else {
        const result = await addTask(input, repeat);
        if (repeat) {
          toast.show(
            result.created === 0
              ? 'Nothing added: those days already have this task.'
              : `Added ${result.created} tasks${result.skipped ? ` (${result.skipped} already existed)` : ''}`,
            result.created === 0 ? 'error' : 'success',
          );
        } else {
          toast.show('Task added');
        }
      }
      onClose();
    } catch (err) {
      setFormError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit task' : 'Add task'} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="form">
        <div className="field">
          <label htmlFor="task-title">Task title</label>
          <input
            id="task-title" className="input" value={title} maxLength={200} data-autofocus
            onChange={(e) => setTitle(e.target.value)} placeholder="For example: Read chapter 4"
            aria-invalid={!!errors.title} aria-describedby={errors.title ? 'task-title-err' : undefined}
          />
          {errors.title && <p className="field-error" id="task-title-err">{errors.title}</p>}
        </div>

        <div className="field">
          <label htmlFor="task-category">Category</label>
          <select id="task-category" className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-date">Date</label>
            <input
              id="task-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)}
              aria-invalid={!!errors.date} aria-describedby={errors.date ? 'task-date-err' : undefined}
            />
            {errors.date && <p className="field-error" id="task-date-err">{errors.date}</p>}
          </div>
          <div className="field">
            <label htmlFor="task-time">Time <span className="muted">(optional)</span></label>
            <input id="task-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {!editing && (
          <label className="toggle-row">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            <span>
              Repeat daily
              <small className="muted">Creates this task on the chosen date and the next {REPEAT_DAYS - 1} days. Days that already have it are skipped.</small>
            </span>
          </label>
        )}

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : repeat ? `Add ${REPEAT_DAYS} tasks` : 'Add task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
