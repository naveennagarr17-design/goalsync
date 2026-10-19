import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Calendar from '../components/Calendar';
import ChartCard, { axisTick, tooltipStyle } from '../components/ChartCard';
import DayDetail from '../components/DayDetail';
import ProgressRing from '../components/ProgressRing';
import StatCard from '../components/StatCard';
import TaskList from '../components/TaskList';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { addDays, isValidISODate, startOfMonth, startOfWeek } from '../lib/dates';
import { categoryStats, inRange, percentText, series, sortTasks, summarize } from '../lib/stats';
import { CATEGORY_COLORS } from '../lib/themes';

export default function FriendView() {
  const { friend, friendship, friendTasks, loading, error, today, reload } = useData();
  const { accentColor } = useTheme();
  const [date, setDate] = useState(addDays(today, -1));

  if (loading) return <Loading />;
  if (error && !friend) return <ErrorState message={error} onRetry={() => void reload()} />;

  if (!friend) {
    return (
      <div className="page">
        <section className="card">
          <EmptyState
            icon={<Users size={28} />}
            title={friendship?.status === 'pending' ? 'Connection not accepted yet' : 'You are not connected yet'}
            hint={friendship?.status === 'pending'
              ? (friendship.i_am_requester ? `Waiting for ${friendship.other_name} to accept your request.` : `${friendship.other_name} sent you a request. Accept it in Settings.`)
              : 'Once you and your friend connect, you can see each other’s progress here. Nobody can edit the other person’s tasks.'}
            action={<Link className="btn btn-primary" to="/settings">Open Settings</Link>}
          />
        </section>
      </div>
    );
  }

  const counted = inRange(friendTasks, '0000-01-01', today);
  const overall = summarize(counted);
  const todays = sortTasks(friendTasks.filter((t) => t.task_date === today));
  const todaySum = summarize(todays);
  const week = summarize(inRange(friendTasks, startOfWeek(today), today));
  const month = summarize(inRange(friendTasks, startOfMonth(today), today));
  const cats = categoryStats(counted).filter((c) => c.total > 0);
  const last14 = series(friendTasks, addDays(today, -13), today, 'day');
  const hasHistory = last14.some((p) => p.total > 0);
  const chosen = isValidISODate(date) ? date : today;

  return (
    <div className="page friend-page">
      <div className="banner" role="note">
        <Eye size={20} aria-hidden />
        <div>
          <strong>You are viewing {friend.name}’s progress.</strong>
          <span> This page is read-only. Only {friend.name} can add, edit, complete or delete these tasks.</span>
        </div>
      </div>

      <div className="friend-hero card">
        <div className="friend-who">
          <span className="avatar big" aria-hidden>{friend.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>{friend.name}</h2>
            <p className="muted">All time through today</p>
          </div>
        </div>
        <ProgressRing percent={overall.percent} size={150} stroke={14} caption="complete" />
        <div className="stats-grid two">
          <StatCard label="Completed" value={overall.completed} />
          <StatCard label="Pending" value={overall.pending} />
          <StatCard label="Today" value={`${todaySum.completed}/${todaySum.total}`} hint={percentText(todaySum.percent)} />
          <StatCard label="This week" value={percentText(week.percent)} hint={`${week.completed}/${week.total} tasks`} />
          <StatCard label="This month" value={percentText(month.percent)} hint={`${month.completed}/${month.total} tasks`} />
        </div>
      </div>

      <div className="analytics-grid">
        <section className="card" aria-labelledby="ft-h">
          <h2 id="ft-h">{friend.name}’s tasks today</h2>
          <TaskList tasks={todays} readOnly emptyTitle="No tasks scheduled today" />
        </section>

        <ChartCard title="Category progress" subtitle="All time through today" empty={cats.length === 0 ? 'No tasks yet.' : undefined}>
          <ul className="cat-bars">
            {cats.map((c) => (
              <li key={c.category}>
                <div className="cat-row">
                  <span><span className="badge-dot" style={{ background: CATEGORY_COLORS[c.category] }} aria-hidden /> {c.category}</span>
                  <span><strong>{percentText(c.percent)}</strong> <span className="muted">({c.completed}/{c.total})</span></span>
                </div>
                <div className="bar" aria-hidden><div className="bar-fill" style={{ width: `${c.percent ?? 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Daily completion, last 14 days" empty={!hasHistory ? 'No tasks in the last 14 days.' : undefined}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={last14} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={16} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [v === null ? 'No tasks' : `${v}% (${item.payload.completed}/${item.payload.total})`, 'Completion']} />
              <Bar dataKey="percent" name="Completion" fill={accentColor} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <h2 className="section-title">{friend.name}’s history</h2>
      <div className="history-grid">
        <section className="card" aria-labelledby="fh-pick">
          <h2 id="fh-pick">Choose a date</h2>
          <div className="quick-dates">
            <button className="btn btn-secondary btn-sm" onClick={() => setDate(addDays(today, -1))}>Yesterday</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDate(today)}>Today</button>
          </div>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Pick any date" />
          <Calendar selected={chosen} today={today} tasks={friendTasks} onSelect={setDate} />
        </section>
        <DayDetail tasks={friendTasks} date={chosen} today={today} readOnly personName={friend.name} />
      </div>
    </div>
  );
}
