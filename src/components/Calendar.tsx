import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, formatLong, monthGrid, parseISODate, startOfMonth, toISODate } from '../lib/dates';
import { groupByDate } from '../lib/stats';
import type { Task } from '../lib/types';

interface Props {
  selected: string;
  today: string;
  tasks: Task[];
  onSelect: (date: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }));

export default function Calendar({ selected, today, tasks, onSelect }: Props) {
  const [view, setView] = useState(startOfMonth(selected));
  useEffect(() => setView(startOfMonth(selected)), [selected]);

  const byDate = useMemo(() => groupByDate(tasks), [tasks]);
  const grid = useMemo(() => monthGrid(view), [view]);
  const viewDate = parseISODate(view);
  const thisYear = parseISODate(today).getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    const first = Math.min(thisYear - 8, viewDate.getFullYear());
    const last = Math.max(thisYear + 3, viewDate.getFullYear());
    for (let y = first; y <= last; y++) list.push(y);
    return list;
  }, [thisYear, viewDate]);

  function jump(year: number, month: number) {
    setView(toISODate(new Date(year, month, 1)));
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setView(addMonths(view, -1))} aria-label="Previous month"><ChevronLeft size={20} /></button>
        <div className="cal-selects">
          <select aria-label="Month" value={viewDate.getMonth()} onChange={(e) => jump(viewDate.getFullYear(), Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select aria-label="Year" value={viewDate.getFullYear()} onChange={(e) => jump(Number(e.target.value), viewDate.getMonth())}>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <button className="icon-btn" onClick={() => setView(addMonths(view, 1))} aria-label="Next month"><ChevronRight size={20} /></button>
      </div>

      <div className="cal-grid" role="grid" aria-label="Calendar">
        {WEEKDAYS.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
        {grid.flat().map((date) => {
          const list = byDate.get(date) ?? [];
          const done = list.filter((t) => t.completed).length;
          const pending = list.length - done;
          const inMonth = parseISODate(date).getMonth() === viewDate.getMonth();
          const classes = ['cal-day', !inMonth && 'other', date === today && 'today', date === selected && 'selected'].filter(Boolean).join(' ');
          const label = `${formatLong(date)}${list.length ? `, ${list.length} ${list.length === 1 ? 'task' : 'tasks'}, ${done} completed` : ', no tasks'}`;
          return (
            <button key={date} className={classes} onClick={() => onSelect(date)} aria-pressed={date === selected} aria-label={label}>
              <span className="cal-num">{parseISODate(date).getDate()}</span>
              <span className="cal-dots" aria-hidden>
                {pending > 0 && <i className="dot dot-pending" />}
                {done > 0 && <i className="dot dot-done" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cal-foot">
        <span className="legend"><i className="dot dot-pending" /> Has pending tasks</span>
        <span className="legend"><i className="dot dot-done" /> Has completed tasks</span>
        <button className="btn btn-ghost btn-sm" onClick={() => onSelect(today)}>Today</button>
      </div>
    </div>
  );
}
