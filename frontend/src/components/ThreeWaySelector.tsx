import React from 'react';

export type ReviewOutcome = 'false_alarm' | 'needs_check' | 'confirmed_fault';

interface ThreeWaySelectorProps {
  value: ReviewOutcome;
  onChange: (val: ReviewOutcome) => void;
}

export const ThreeWaySelector: React.FC<ThreeWaySelectorProps> = ({ value, onChange }) => {
  return (
    <div className="inline-flex bg-plate border border-line p-1 rounded gap-1 select-none">
      <button
        type="button"
        onClick={() => onChange('false_alarm')}
        className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all ${
          value === 'false_alarm'
            ? 'bg-sheet text-graphite shadow-xs border border-line'
            : 'text-graphite-2 hover:text-graphite'
        }`}
      >
        [1] False Alarm
      </button>

      <button
        type="button"
        onClick={() => onChange('needs_check')}
        className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all ${
          value === 'needs_check'
            ? 'bg-watch text-white shadow-xs'
            : 'text-graphite-2 hover:text-graphite'
        }`}
      >
        [2] Needs Inspection
      </button>

      <button
        type="button"
        onClick={() => onChange('confirmed_fault')}
        className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all ${
          value === 'confirmed_fault'
            ? 'bg-fault text-white shadow-xs'
            : 'text-graphite-2 hover:text-graphite'
        }`}
      >
        [3] Confirmed Fault
      </button>
    </div>
  );
};
