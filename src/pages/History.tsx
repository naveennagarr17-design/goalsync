import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Calendar from '../components/Calendar';
import DayDetail from '../components/DayDetail';
import ActivityLog from '../components/ActivityLog';
import { ErrorState, Loading } from '../components/States';
import { useData } from '../context/DataContext';
import { addDays, isValidISODate } from '../lib/dates';

export default function History() {
  const { myTasks, loading, error, today, reload } = useData();
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('date');
  const date = fromUrl && isValidISODate(fromUrl) ? fromUrl : addDays(today, -1); // default: yesterday
  const setDate = (d: string) => { if (isValidISODate(d)) setParams({ date: d }, { replace: true }); };

  if (loading) return <Loading />;
  if (error && myTasks.length === 0) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <div className="page">
      <div className="history-grid">
        <div className="col">
          <section className="card" aria-labelledby="pick-h">
            <h2 id="pick-h">Choose a date</h2>
            <div className="quick-dates">
              <button className="btn btn-secondary btn-sm" onClick={() => setDate(addDays(today, -1))}>Yesterday</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setDate(today)}>Today</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setDate(addDays(today, -7))}>A week ago</button>
            </div>
            <div className="date-stepper">
              <button className="icon-btn outlined" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft size={19} /></button>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Pick any date" />
              <button className="icon-btn outlined" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><ChevronRight size={19} /></button>
            </div>
            <Calendar selected={date} today={today} tasks={myTasks} onSelect={setDate} />
          </section>
        </div>
        <div className="col">
          <DayDetail tasks={myTasks} date={date} today={today} />
          <ActivityLog date={date} />
        </div>
      </div>
    </div>
  );
}
