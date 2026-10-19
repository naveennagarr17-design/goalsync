import type { ReactNode } from 'react';

export default function ChartCard({ title, subtitle, children, empty }: { title: string; subtitle?: string; children: ReactNode; empty?: string }) {
  return (
    <section className="card chart-card">
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
      {empty ? <div className="chart-empty">{empty}</div> : <div className="chart-box">{children}</div>}
    </section>
  );
}

export const tooltipStyle = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13 },
  labelStyle: { color: 'var(--text)', fontWeight: 600 },
  itemStyle: { color: 'var(--text)' },
  cursor: { fill: 'var(--accent-soft)', opacity: 0.6 },
};

export const axisTick = { fill: 'var(--muted)', fontSize: 12 };
