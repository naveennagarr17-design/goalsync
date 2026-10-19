import { useState } from 'react';
import { addDays, todayISO } from '../lib/dates';
import { PRESET_LABELS, type RangePreset } from '../lib/stats';

export interface RangeState {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  custom: { from: string; to: string };
  setCustom: (c: { from: string; to: string }) => void;
}

export function useRangeState(initial: RangePreset): RangeState {
  const [preset, setPreset] = useState<RangePreset>(initial);
  const [custom, setCustom] = useState(() => ({ from: addDays(todayISO(), -13), to: todayISO() }));
  return { preset, setPreset, custom, setCustom };
}

export default function RangeFilter({ state, options }: { state: RangeState; options: RangePreset[] }) {
  const { preset, setPreset, custom, setCustom } = state;
  return (
    <div className="range-filter">
      <div className="seg" role="group" aria-label="Date range">
        {options.map((p) => (
          <button key={p} type="button" className={preset === p ? 'on' : ''} aria-pressed={preset === p} onClick={() => setPreset(p)}>
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="field-row range-custom">
          <div className="field">
            <label htmlFor="range-from">From</label>
            <input id="range-from" type="date" className="input" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="range-to">To</label>
            <input id="range-to" type="date" className="input" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
