import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard, { axisTick, tooltipStyle } from '../components/ChartCard';
import ProgressRing from '../components/ProgressRing';
import RangeFilter, { useRangeState } from '../components/RangeFilter';
import StatCard from '../components/StatCard';
import { ErrorState, Loading } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { addDays, formatMedium, maxDate } from '../lib/dates';
import { autoGranularity, categoryStats, inRange, percentText, rangeInsights, resolveRange, series, summarize } from '../lib/stats';
import { CATEGORY_COLORS } from '../lib/themes';

const PENDING = '#e3b04b';
const FRIEND = '#6f8296';

export default function Analytics() {
  const { profile } = useAuth();
  const { myTasks, friendTasks, friend, loading, error, today, reload } = useData();
  const { accentColor } = useTheme();
  const range = useRangeState('30d');

  if (loading) return <Loading />;
  if (error && myTasks.length === 0) return <ErrorState message={error} onRetry={() => void reload()} />;

  const r = resolveRange(range.preset, today, myTasks, range.custom);
  const mine = r.empty ? [] : inRange(myTasks, r.from, r.to);
  const theirs = r.empty || !friend ? [] : inRange(friendTasks, r.from, r.to);
  const summary = summarize(mine);
  const noData = mine.length === 0;
  const noDataText = r.empty ? 'This range has not started yet.' : 'No tasks in this date range yet. Add tasks or pick a different range.';

  const gran = autoGranularity(r.from, r.to);
  const dailyFrom = maxDate(r.from, addDays(r.to, -59));
  const daily = r.empty ? [] : series(myTasks, dailyFrom, r.to, 'day');
  const weekly = r.empty ? [] : series(myTasks, r.from, r.to, 'week').slice(-26);
  const monthly = r.empty ? [] : series(myTasks, r.from, r.to, 'month').slice(-12);
  const trend = r.empty ? [] : series(myTasks, r.from, r.to, gran);
  const cats = categoryStats(mine).filter((c) => c.total > 0);
  const insights = rangeInsights(mine);

  const friendTrend = r.empty || !friend ? [] : series(friendTasks, r.from, r.to, gran);
  const compare = trend.map((p, i) => ({ label: p.label, me: p.percent, friend: friendTrend[i]?.percent ?? null }));
  const mySum = summary;
  const theirSum = summarize(theirs);
  const granWord = gran === 'day' ? 'daily' : gran === 'week' ? 'weekly' : 'monthly';

  return (
    <div className="page">
      <section className="card" aria-labelledby="filter-h">
        <h2 id="filter-h">Date range</h2>
        <RangeFilter state={range} options={['7d', '30d', 'month', 'prevMonth', 'custom', 'all']} />
        <p className="note">
          Showing <strong>{r.label}</strong>. Every chart uses this range. Tasks after today are not counted.
          {r.cappedAtToday ? ' Your chosen end date was after today, so the range stops today.' : ''}
        </p>
      </section>

      <div className="analytics-grid">
        <ChartCard title="Overall completion" subtitle={r.label} empty={noData ? noDataText : undefined}>
          <div className="ring-card">
            <ProgressRing percent={summary.percent} size={170} stroke={15} caption="complete" />
            <p className="muted">{summary.completed} completed · {summary.pending} pending · {summary.total} total</p>
          </div>
        </ChartCard>

        <ChartCard title="Range insights" subtitle="Days that had at least one task" empty={noData ? noDataText : undefined}>
          <div className="stats-grid two">
            <StatCard label="Active days" value={insights.activeDays} />
            <StatCard label="Perfect days" value={insights.perfectDays} hint="every task done" />
            <StatCard label="Average day" value={percentText(insights.averageDaily)} />
            <StatCard label="Best day" value={insights.bestDay ? `${insights.bestDay.percent}%` : '–'} hint={insights.bestDay ? formatMedium(insights.bestDay.date) : undefined} />
          </div>
        </ChartCard>

        <ChartCard
          title="Completed vs pending, by day"
          subtitle={dailyFrom > r.from ? 'The most recent 60 days of this range' : undefined}
          empty={noData ? noDataText : undefined}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="completed" name="Completed" stackId="a" fill={accentColor} radius={[0, 0, 3, 3]} />
              <Bar dataKey="pending" name="Pending" stackId="a" fill={PENDING} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Completion over time" subtitle={`Percent of tasks completed, ${granWord}`} empty={noData ? noDataText : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => (v === null || v === undefined ? ['No tasks', 'Completion'] : [`${v}%`, 'Completion'])} />
              <Line type="monotone" dataKey="percent" name="Completion" stroke={accentColor} strokeWidth={2.5} dot={trend.length <= 31} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly progress" subtitle="Weeks start on Monday" empty={noData ? noDataText : undefined}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={14} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [v === null ? 'No tasks' : `${v}% (${item.payload.completed}/${item.payload.total})`, 'Completion']} labelFormatter={(l) => `Week of ${l}`} />
              <Bar dataKey="percent" name="Completion" fill={accentColor} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly progress" empty={noData ? noDataText : undefined}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [v === null ? 'No tasks' : `${v}% (${item.payload.completed}/${item.payload.total})`, 'Completion']} />
              <Bar dataKey="percent" name="Completion" fill={accentColor} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By category" subtitle="Completed and pending tasks" empty={cats.length === 0 ? noDataText : undefined}>
          <ResponsiveContainer width="100%" height={Math.max(200, cats.length * 46 + 40)}>
            <BarChart data={cats} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="category" width={74} tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="completed" name="Completed" stackId="c" fill={accentColor} />
              <Bar dataKey="pending" name="Pending" stackId="c" fill={PENDING} />
            </BarChart>
          </ResponsiveContainer>
          <ul className="cat-list">
            {cats.map((c) => (
              <li key={c.category}>
                <span className="badge-dot" style={{ background: CATEGORY_COLORS[c.category] }} aria-hidden />
                {c.category}: <strong>{percentText(c.percent)}</strong> <span className="muted">({c.completed}/{c.total})</span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title={friend ? `You vs ${friend.name}` : 'You vs your friend'}
          subtitle={friend ? `Same dates for both: ${r.label}` : undefined}
          empty={!friend ? 'Connect with your friend in Settings to compare progress.' : noData && theirs.length === 0 ? noDataText : undefined}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={compare} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => (v === null || v === undefined ? 'No tasks' : `${v}%`)} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="me" name={profile?.display_name ?? 'You'} stroke={accentColor} strokeWidth={2.5} dot={compare.length <= 31} connectNulls />
              <Line type="monotone" dataKey="friend" name={friend?.name ?? 'Friend'} stroke={FRIEND} strokeWidth={2.5} strokeDasharray="6 4" dot={compare.length <= 31} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="compare-totals">
            <div><strong>{percentText(mySum.percent)}</strong><span>{profile?.display_name ?? 'You'} · {mySum.completed}/{mySum.total}</span></div>
            <div><strong>{percentText(theirSum.percent)}</strong><span>{friend?.name} · {theirSum.completed}/{theirSum.total}</span></div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
