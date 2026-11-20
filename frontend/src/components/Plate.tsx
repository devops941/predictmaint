import React from 'react';
import { LabelTape } from './LabelTape';

interface PlateProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  subtitle?: string;
}

export const Plate: React.FC<PlateProps> = ({
  title,
  badge,
  badgeColor,
  children,
  className = '',
  actions,
  subtitle,
}) => {
  return (
    <div className={`relative bg-sheet border border-line rounded rounded-tl-none shadow-xs mt-3 ${className}`}>
      {/* Label-maker tape title sits on top left */}
      <div className="absolute -top-[23px] left-0 flex items-center justify-between w-full pr-2">
        <LabelTape title={title} badge={badge} badgeColor={badgeColor} />
        {actions && <div className="flex items-center gap-2 -mt-1">{actions}</div>}
      </div>

      {subtitle && (
        <div className="px-4 pt-3 pb-1 text-xs text-graphite-2 font-mono border-b border-line/50">
          {subtitle}
        </div>
      )}

      <div className="p-4">{children}</div>
    </div>
  );
};
