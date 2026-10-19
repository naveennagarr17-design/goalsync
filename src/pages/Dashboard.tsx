import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Flame, ListTodo, Plus, Target, Users } from 'lucide-react';
import ProgressRing from '../components/ProgressRing';
import StatCard from '../components/StatCard';
import TaskList from '../components/TaskList';
import Calendar from '../components/Calendar';
import DayDetail from '../components/DayDetail';
import RangeFilter, { useRangeState } from '../components/RangeFilter';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useTaskModal } from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { greeting } from '../lib/dates';
import { currentStreak, inRange, percentText, PRESET_LABELS, resolveRange, sortTasks, summarize } from '../lib/stats';

export default function Dashboard() {
  const { profile } = useAuth();
  const { myTasks, friendTasks, friend, friendship, loading, error, today, reload } = useData();
  const { openAdd } = useTaskModal();
  const range = useRangeState('all');
  const [selected, setSelected] = useState(today);

  if (loading) return <Loading />;
  if (error && myTasks.length === 0) return <ErrorState message={error} onRetry={() => void reload()} />;

  const r = resolveRange(range.preset, today, myTasks, range.custom);
  const overall = summarize(r.empty ? [] : inRange(myTasks, r.from, r.to));
  const todayTasks = sortTasks(myTasks.filter((t) => t.task_date === today));
  const todaySummary = summarize(todayTasks);
  const streak = currentStreak(myTasks, today);
  const upcoming = myTasks.filter((t) => t.task_date > today).length;

  return (
    <div className="page">
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="hello">{greeting()}, {profile?.display_name}.</p>

      <div className="dash-grid">
        <div className="col">
          <section className="card" aria-labelledby="overall-h">
            <div className="card-head">
              <div>
                <h2 id="overall-h">Overall progress</h2>
                <p className="muted">{PRESET_LABELS[range.preset]}: {r.label}</p>
              </div>
            </div>
            <RangeFilter state={range} options={['all', 'week', 'month', 'custom']} />
            <div className="overall">
              <ProgressRing percent={overall.percent} size={176} stroke={15} caption={overall.percent === null ? 'no tasks yet' : 'complete'} />
              <dl className="overall-counts">
                <div><dt>Completed</dt><dd>{overall.completed}</dd></div>
                <div><dt>Total</dt><dd>{overall.total}</dd></div>
                <div><dt>Pending</dt><dd>{overall.pending}</dd></div>
              </dl>
            </div>
            <p className="note">
              Percentage = completed ÷ total tasks in this range.
              {upcoming > 0 ? ` ${upcoming} upcoming ${upcoming === 1 ? 'task' : 'tasks'} after today ${upcoming === 1 ? 'is' : 'are'} not counted yet.` : ''}
            </p>
          </section>

          <section className="card" aria-labelledby="today-h">
            <div className="card-head">
              <div>
                <h2 id="today-h">Today’s tasks</h2>
                <p className="muted">{todaySummary.completed} of {todaySummary.total} done</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => openAdd(today)}><Plus size={16} aria-hidden /> Add</button>
            </div>
            <TaskList tasks={todayTasks} emptyTitle="Nothing scheduled today" emptyHint="Add a task to start your day, or enjoy the free time." />
          </section>
        </div>

        <div className="col">
          <section aria-label="Daily statistics" className="stats-grid">
            <StatCard icon={<CheckCircle2 size={15} aria-hidden />} label="Done today" value={todaySummary.completed} />
            <StatCard icon={<CalendarCheck size={15} aria-hidden />} label="Scheduled today" value={todaySummary.total} />
            <StatCard icon={<ListTodo size={15} aria-hidden />} label="Still pending" value={todaySummary.pending} />
            <StatCard icon={<Target size={15} aria-hidden />} label="Completion rate" value={percentText(overall.percent)} hint={PRESET_LABELS[range.preset]} />
            <StatCard
              icon={<Flame size={15} aria-hidden />} label="Day streak" value={streak}
              hint={streak === 0 ? 'Finish every task in a day to start' : 'days in a row with every task done'}
            />
          </section>

          <FriendSummary
            name={friend?.name}
            status={friendship?.status}
            fromMe={friendship?.i_am_requester}
            tasks={friendTasks}
            today={today}
          />

          <section className="card" aria-labelledby="cal-h">
            <h2 id="cal-h">Calendar</h2>
            <Calendar selected={selected} today={today} tasks={myTasks} onSelect={setSelected} />
          </section>
        </div>
      </div>

      {selected !== today && (
        <>
          <DayDetail tasks={myTasks} date={selected} today={today} />
          <div className="right">
            <Link className="btn btn-ghost btn-sm" to={`/history?date=${selected}`}>Open this day in Past History</Link>
          </div>
        </>
      )}
    </div>
  );
}

function FriendSummary({ name, status, fromMe, tasks, today }: {
  name?: string; status?: 'pending' | 'accepted'; fromMe?: boolean; tasks: import('../lib/types').Task[]; today: string;
}) {
  if (!name) {
    return (
      <section className="card" aria-labelledby="friend-h">
        <h2 id="friend-h">Friend’s progress</h2>
        <EmptyState
          icon={<Users size={26} />}
          title={status === 'pending' ? (fromMe ? 'Waiting for your friend to accept' : 'Your friend sent you a request') : 'Not connected yet'}
          hint={status === 'pending' ? 'You can manage the request in Settings.' : 'Connect in Settings to see each other’s progress.'}
          action={<Link className="btn btn-secondary btn-sm" to="/settings">Open Settings</Link>}
        />
      </section>
    );
  }
  const upToToday = summarize(inRange(tasks, '0000-01-01', today));
  const todays = summarize(tasks.filter((t) => t.task_date === today));
  return (
    <section className="card" aria-labelledby="friend-h">
      <h2 id="friend-h">{name}’s progress</h2>
      <div className="friend-mini">
        <ProgressRing percent={upToToday.percent} size={104} stroke={11} />
        <dl className="friend-counts">
          <div><dt>Completed</dt><dd>{upToToday.completed}</dd></div>
          <div><dt>Pending</dt><dd>{upToToday.pending}</dd></div>
          <div><dt>Today</dt><dd>{todays.total} tasks</dd></div>
          <div><dt>Today done</dt><dd>{percentText(todays.percent)}</dd></div>
        </dl>
      </div>
      <Link className="btn btn-secondary btn-block" to="/friend">Open {name}’s dashboard</Link>
    </section>
  );
}
