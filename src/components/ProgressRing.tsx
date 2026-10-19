import { percentText } from '../lib/stats';

interface Props { percent: number | null; size?: number; stroke?: number; caption?: string }

export default function ProgressRing({ percent, size = 160, stroke = 14, caption }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - (percent ?? 0) / 100);
  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={percent === null ? 'No tasks in this range yet' : `${percent} percent complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring-value"
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <strong style={{ fontSize: size * 0.24 }}>{percentText(percent)}</strong>
        {caption && <span style={{ fontSize: Math.max(11, size * 0.085) }}>{caption}</span>}
      </div>
    </div>
  );
}
