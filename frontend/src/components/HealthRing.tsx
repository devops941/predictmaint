import React from 'react';
import { MachineState } from './StateBadge';

interface HealthRingProps {
  healthIndex: number;
  size?: number;
  state?: MachineState;
}

export const HealthRing: React.FC<HealthRingProps> = ({ healthIndex, size = 64, state = 'Healthy' }) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, healthIndex));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colorMap: Record<MachineState, string> = {
    Healthy: 'var(--steel)',
    Watch: 'var(--watch)',
    Alert: 'var(--hivis)',
    Critical: 'var(--fault)',
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--line)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorMap[state]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono font-bold text-xs text-graphite">{Math.round(healthIndex)}</span>
      </div>
    </div>
  );
};
