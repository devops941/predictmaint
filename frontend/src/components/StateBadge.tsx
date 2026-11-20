import React from 'react';

export type MachineState = 'Healthy' | 'Watch' | 'Alert' | 'Critical';

interface StateBadgeProps {
  state: MachineState;
  showIcon?: boolean;
  className?: string;
}

export const StateBadge: React.FC<StateBadgeProps> = ({ state, showIcon = true, className = '' }) => {
  const configs: Record<MachineState, { icon: string; bg: string; text: string; border: string }> = {
    Healthy: {
      icon: '✓',
      bg: 'var(--steel-wash)',
      text: 'var(--steel)',
      border: 'var(--steel)',
    },
    Watch: {
      icon: '◐',
      bg: '#FFF8E6',
      text: '#7F5A00',
      border: 'var(--watch)',
    },
    Alert: {
      icon: '▲',
      bg: 'var(--hivis-wash)',
      text: 'var(--hivis-deep)',
      border: 'var(--hivis)',
    },
    Critical: {
      icon: '✖',
      bg: '#FDF2F2',
      text: 'var(--fault)',
      border: 'var(--fault)',
    },
  };

  const cfg = configs[state] || configs.Healthy;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase font-bold tracking-wider border ${className}`}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      {showIcon && <span>{cfg.icon}</span>}
      <span>{state}</span>
    </span>
  );
};
