import React from 'react';

export interface LabelTapeProps {
  title?: string;
  text?: string;
  badge?: string;
  badgeColor?: string;
  color?: string;
}

export const LabelTape: React.FC<LabelTapeProps> = ({ title, text, badge, badgeColor, color }) => {
  const labelText = title || text || '';
  const effectiveBadgeColor = badgeColor || color || 'var(--hivis)';

  return (
    <div className="inline-flex items-center gap-2 bg-graphite text-white px-2.5 py-0.5 rounded-t-sm shadow-xs border-b border-graphite">
      <span className="label-tape-text text-[11px] tracking-[0.14em] uppercase text-white font-mono font-bold">
        {labelText}
      </span>
      {badge && (
        <span
          className="text-[9px] font-mono px-1 rounded uppercase tracking-wider font-bold"
          style={{
            backgroundColor: effectiveBadgeColor,
            color: 'var(--graphite)',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
};
