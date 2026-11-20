import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface SensorChannel {
  key: string;
  name: string;
  unit: string;
  color: string;
  baseline?: number;
  alertThreshold?: number;
}

export interface StripChartRecorderProps {
  data: Array<Record<string, any>>;
  title?: string;
  showBrush?: boolean;
  sensors?: SensorChannel[];
}

const DEFAULT_SENSORS: SensorChannel[] = [
  { key: 'vibration_rms_mm_s', name: 'Vibration RMS', unit: 'mm/s', color: 'var(--fault)', baseline: 2.5, alertThreshold: 4.5 },
  { key: 'bearing_temp_c', name: 'Bearing Temp', unit: '°C', color: '#D9500A', baseline: 55.0, alertThreshold: 75.0 },
  { key: 'motor_current_a', name: 'Motor Current', unit: 'A', color: 'var(--steel)', baseline: 62.0, alertThreshold: 72.0 },
  { key: 'pressure_bar', name: 'Pressure', unit: 'bar', color: '#3F7C85', baseline: 6.8, alertThreshold: 7.8 },
  { key: 'speed_rpm', name: 'Speed', unit: 'rpm', color: 'var(--graphite-3)', baseline: 1480.0, alertThreshold: 1550.0 },
];

export const StripChartRecorder: React.FC<StripChartRecorderProps> = ({
  data,
  title = 'CONTINUOUS STRIP-CHART RECORDER [PM-V1]',
  sensors = DEFAULT_SENSORS,
}) => {
  const [activeSensors, setActiveSensors] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sensors.forEach((s, idx) => {
      initial[s.key] = idx < 3; // First 3 active by default
    });
    return initial;
  });

  const toggleSensor = (key: string) => {
    setActiveSensors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formattedData = data.map((d, i) => {
    const point: Record<string, any> = { ...d };
    if (d.time) {
      point._time = d.time;
    } else if (d.ts) {
      const date = new Date(d.ts);
      point._time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      point._time = `pt-${i}`;
    }

    // Fallback key mappings if legacy names used
    if (d.vibration_rms !== undefined && d.vibration_rms_mm_s === undefined) point.vibration_rms_mm_s = d.vibration_rms;
    if (d.bearing_temp !== undefined && d.bearing_temp_c === undefined) point.bearing_temp_c = d.bearing_temp;
    if (d.motor_current !== undefined && d.motor_current_a === undefined) point.motor_current_a = d.motor_current;
    if (d.line_pressure !== undefined && d.pressure_bar === undefined) point.pressure_bar = d.line_pressure;
    if (d.rotational_speed !== undefined && d.speed_rpm === undefined) point.speed_rpm = d.rotational_speed;

    return point;
  });

  return (
    <div className="bg-sheet border border-line rounded p-4">
      {/* Sensor toggle switches */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line mb-3">
        <span className="text-xs font-mono font-bold text-graphite uppercase tracking-wider">
          {title}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {sensors.map(s => {
            const isActive = !!activeSensors[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSensor(s.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border transition-colors ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-plate text-graphite-3 border-line'
                }`}
                style={{
                  backgroundColor: isActive ? s.color : undefined,
                }}
              >
                ● {s.name} ({s.unit})
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts chart */}
      <div className="h-72 w-full">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center font-mono text-xs text-graphite-3">
            Awaiting continuous telemetry points...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--line)" />
              <XAxis
                dataKey="_time"
                stroke="var(--graphite-3)"
                fontSize={10}
                fontFamily="Share Tech Mono"
                tickLine={false}
              />
              <YAxis
                stroke="var(--graphite-3)"
                fontSize={10}
                fontFamily="Share Tech Mono"
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--sheet)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontFamily: 'Share Tech Mono',
                  fontSize: '11px',
                  color: 'var(--graphite)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Share Tech Mono', fontSize: '11px', paddingTop: '8px' }} />

              {sensors.map(s => {
                if (!activeSensors[s.key]) return null;
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={`${s.name} (${s.unit})`}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-line/60 mt-3 font-mono text-[10px] text-graphite-3">
        <span>SAMPLING: 10 MIN INTERVALS • FIFO BUFFER</span>
        <span>HIGH-VOLTAGE RESILIENT SENSOR BUS</span>
      </div>
    </div>
  );
};
