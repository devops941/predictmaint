import React from 'react';
import { motion } from 'framer-motion';

export interface DialGaugeProps {
  title?: string;
  label?: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  statusText?: string;
  statusColor?: string;
  tone?: 'nominal' | 'watch' | 'alert' | 'critical' | 'auto';
  higherIsBetter?: boolean; // When true (e.g. Health Score), 100 = Optimal/Green, 0 = Critical/Red
  embedded?: boolean; // When true, blends seamlessly inside a parent Plate without double-border
  thresholds?: {
    watch: number;
    alert: number;
    critical: number;
  };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

export const DialGauge: React.FC<DialGaugeProps> = ({
  title,
  label,
  value,
  min = 0,
  max = 100,
  unit = '',
  statusText,
  statusColor,
  tone = 'auto',
  higherIsBetter = false,
  embedded = false,
  thresholds,
}) => {
  const displayTitle = title || label || 'METRIC';
  const clamped = Math.max(min, Math.min(max, value));
  // Needle sweep angle: -120 deg to +120 deg (240 deg span)
  const percent = max > min ? (clamped - min) / (max - min) : 0;
  const targetAngle = -120 + percent * 240;

  // Industrial Color Palette: No Blue!
  const COLOR_GREEN = '#16A34A';  // Nominal / Healthy
  const COLOR_AMBER = '#D97706';  // Watch / Trending
  const COLOR_ORANGE = '#FF6A13'; // Alert / Degraded
  const COLOR_RED = '#DC2626';    // Critical / Fault

  // Status & Color Determination
  let effectiveColor = statusColor || '#1C1F24';
  let computedStatus = 'NOMINAL';

  if (tone === 'nominal') {
    effectiveColor = COLOR_GREEN;
    computedStatus = 'NOMINAL';
  } else if (tone === 'watch') {
    effectiveColor = COLOR_AMBER;
    computedStatus = 'WATCH';
  } else if (tone === 'alert') {
    effectiveColor = COLOR_ORANGE;
    computedStatus = 'ALERT';
  } else if (tone === 'critical') {
    effectiveColor = COLOR_RED;
    computedStatus = 'CRITICAL';
  } else if (higherIsBetter) {
    // High is good (e.g. Health Index 0-100)
    const critThresh = thresholds?.critical ?? 35;
    const alertThresh = thresholds?.alert ?? 55;
    const watchThresh = thresholds?.watch ?? 75;

    if (value <= critThresh) {
      effectiveColor = COLOR_RED;
      computedStatus = 'CRITICAL';
    } else if (value <= alertThresh) {
      effectiveColor = COLOR_ORANGE;
      computedStatus = 'ALERT';
    } else if (value <= watchThresh) {
      effectiveColor = COLOR_AMBER;
      computedStatus = 'WATCH';
    } else {
      effectiveColor = COLOR_GREEN;
      computedStatus = 'NOMINAL';
    }
  } else {
    // Low is good (e.g. Failure Risk 0-100%, Temperature, Vibration)
    const watchThresh = thresholds?.watch ?? 35;
    const alertThresh = thresholds?.alert ?? 60;
    const critThresh = thresholds?.critical ?? 80;

    if (value >= critThresh) {
      effectiveColor = COLOR_RED;
      computedStatus = 'CRITICAL';
    } else if (value >= alertThresh) {
      effectiveColor = COLOR_ORANGE;
      computedStatus = 'ALERT';
    } else if (value >= watchThresh) {
      effectiveColor = COLOR_AMBER;
      computedStatus = 'WATCH';
    } else {
      effectiveColor = COLOR_GREEN;
      computedStatus = 'NOMINAL';
    }
  }

  // Arc zone colors based on higherIsBetter
  // Sweep: -120 to +120 divided into 4 quarters: [-120..-60], [-60..0], [0..+60], [+60..+120]
  const z1Color = higherIsBetter ? COLOR_RED : COLOR_GREEN;
  const z2Color = higherIsBetter ? COLOR_ORANGE : COLOR_AMBER;
  const z3Color = higherIsBetter ? COLOR_AMBER : COLOR_ORANGE;
  const z4Color = higherIsBetter ? COLOR_GREEN : COLOR_RED;

  const cx = 60;
  const cy = 65;
  const radius = 45;

  return (
    <div
      className={`flex flex-col items-center justify-center w-full transition-all ${
        embedded
          ? 'p-2 bg-transparent'
          : 'bg-sheet border border-line p-4 rounded-lg shadow-xs hover:border-graphite-3'
      }`}
    >
      {/* Title */}
      <span className="text-xs font-mono uppercase tracking-widest text-graphite font-bold mb-1 text-center truncate w-full">
        {displayTitle}
      </span>

      {/* Dial SVG Arc */}
      <div className="relative w-48 h-32 flex items-center justify-center">
        <svg viewBox="0 0 120 85" className="w-full h-full select-none overflow-visible">
          {/* Subtle tick marks at -120, -90, -60, -30, 0, 30, 60, 90, 120 */}
          {[-120, -90, -60, -30, 0, 30, 60, 90, 120].map((deg, idx) => {
            const isMajor = idx % 2 === 0;
            const p1 = polarToCartesian(cx, cy, radius - (isMajor ? 8 : 5), deg);
            const p2 = polarToCartesian(cx, cy, radius + 5, deg);
            return (
              <line
                key={idx}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isMajor ? '#64748B' : '#CBD5E1'}
                strokeWidth={isMajor ? '1.5' : '1'}
                strokeLinecap="round"
              />
            );
          })}

          {/* Background Track Arc */}
          <path
            d={describeArc(cx, cy, radius, -120, 120)}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Quarter Zone 1 (-120 to -60) */}
          <path
            d={describeArc(cx, cy, radius, -120, -60)}
            fill="none"
            stroke={z1Color}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tone === 'auto' || (higherIsBetter ? tone === 'critical' : tone === 'nominal') ? 1 : 0.35}
          />

          {/* Quarter Zone 2 (-60 to 0) */}
          <path
            d={describeArc(cx, cy, radius, -60, 0)}
            fill="none"
            stroke={z2Color}
            strokeWidth="8"
            opacity={tone === 'auto' || (higherIsBetter ? tone === 'alert' : tone === 'watch') ? 1 : 0.35}
          />

          {/* Quarter Zone 3 (0 to 60) */}
          <path
            d={describeArc(cx, cy, radius, 0, 60)}
            fill="none"
            stroke={z3Color}
            strokeWidth="8"
            opacity={tone === 'auto' || (higherIsBetter ? tone === 'watch' : tone === 'alert') ? 1 : 0.35}
          />

          {/* Quarter Zone 4 (60 to 120) */}
          <path
            d={describeArc(cx, cy, radius, 60, 120)}
            fill="none"
            stroke={z4Color}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tone === 'auto' || (higherIsBetter ? tone === 'nominal' : tone === 'critical') ? 1 : 0.35}
          />

          {/* Dial Center Hub */}
          <circle cx={cx} cy={cy} r="6.5" fill="#1C1F24" />
          <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" />

          {/* Animated Spring Needle */}
          <motion.g
            initial={{ rotate: -120 }}
            animate={{ rotate: targetAngle }}
            transition={{
              type: 'spring',
              stiffness: 85,
              damping: 14,
              mass: 0.7,
            }}
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
          >
            {/* Needle Main Body */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - radius + 4}
              stroke="#1C1F24"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Needle Counterbalance Tail */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + 10}
              stroke="#1C1F24"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Colored Needle Tip Indicator */}
            <circle cx={cx} cy={cy - radius + 4} r="2.8" fill={effectiveColor} />
          </motion.g>
        </svg>
      </div>

      {/* Digital Value Readout */}
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="font-display font-black text-3xl md:text-4xl text-graphite leading-none tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs text-graphite-3 uppercase font-bold">
            {unit}
          </span>
        )}
      </div>

      {/* Status Pill Badge */}
      <span
        className="text-[11px] font-mono uppercase tracking-widest font-extrabold mt-2 px-3 py-0.5 rounded-full transition-all"
        style={{
          backgroundColor: `${effectiveColor}18`,
          color: effectiveColor,
          border: `1px solid ${effectiveColor}50`,
        }}
      >
        {statusText || computedStatus}
      </span>
    </div>
  );
};
