import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface ContextPlateProps {
  currentMachine?: string;
  currentLine?: string;
}

export const ContextPlate: React.FC<ContextPlateProps> = ({
  currentMachine = 'PRESS-01',
  currentLine = 'LINE 1',
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const machines = [
    { id: 'PRESS-01', name: 'PRESS-01 · Hydraulic Stamping Press', line: 'LINE 1', state: 'Critical' },
    { id: 'MOTOR-02', name: 'MOTOR-02 · Induction Drive Motor', line: 'LINE 1', state: 'Healthy' },
    { id: 'COMP-05', name: 'COMP-05 · Screw Compressor', line: 'LINE 2', state: 'Alert' },
    { id: 'GEAR-07', name: 'GEAR-07 · Planetary Gearbox', line: 'LINE 2', state: 'Watch' },
    { id: 'PRESS-09', name: 'PRESS-09 · Primary Press', line: 'LINE 3', state: 'Healthy' },
  ];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-sheet border border-line px-3 py-1.5 rounded shadow-xs hover:border-hivis transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-hivis animate-ping" />
        <span className="font-mono text-xs font-bold text-graphite tracking-wider uppercase">
          {currentLine} › {currentMachine}
        </span>
        <span className="text-graphite-3 text-xs">·</span>
        <span className="font-mono text-[10px] text-graphite-2 uppercase">DATA TO 18:00 UTC</span>
        <span className="bg-steel-wash text-steel px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
          SYNTHETIC
        </span>
        <span className="text-graphite-3 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-sheet border border-line rounded shadow-lg z-50 p-2">
          <div className="text-[10px] font-mono uppercase text-graphite-3 px-2 py-1 border-b border-line">
            Select Asset to Inspect
          </div>
          <div className="max-h-60 overflow-y-auto mt-1 space-y-1">
            {machines.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setOpen(false);
                  navigate(`/machines/${m.id}`);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-hivis-wash flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-graphite">{m.id}</div>
                  <div className="text-[10px] text-graphite-2">{m.name}</div>
                </div>
                <span
                  className="text-[9px] font-mono px-1 rounded uppercase font-bold"
                  style={{
                    backgroundColor:
                      m.state === 'Critical'
                        ? 'var(--fault)'
                        : m.state === 'Alert'
                        ? 'var(--hivis)'
                        : m.state === 'Watch'
                        ? 'var(--watch)'
                        : 'var(--steel)',
                    color: m.state === 'Watch' ? '#7F5A00' : 'white',
                  }}
                >
                  {m.state}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
