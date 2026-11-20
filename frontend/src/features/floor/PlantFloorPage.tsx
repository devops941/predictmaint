import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { StateBadge, MachineState } from '../../components/StateBadge';
import { DialGauge } from '../../components/DialGauge';
import { apiRequest } from '../../lib/api';

export const PlantFloorPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [colorMode, setColorMode] = useState<'risk' | 'health'>('risk');
  const [viewMode, setViewMode] = useState<'grid' | 'schematic'>('grid');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [scoring, setScoring] = useState(false);

  const fetchFloor = async () => {
    try {
      const res = await apiRequest('/floor');
      setData(res);
    } catch (err) {
      console.error('Failed to load floor data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloor();
    const interval = setInterval(fetchFloor, 15000);
    return () => clearInterval(interval);
  }, []);

  const triggerScoreRun = async () => {
    setScoring(true);
    try {
      await apiRequest('/score/run', { method: 'POST' });
      await fetchFloor();
    } catch (err) {
      console.error(err);
    } finally {
      setScoring(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto font-mono text-xs text-graphite-3 flex items-center justify-center gap-3 min-h-[60vh]">
        <span className="w-5 h-5 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
        CONNECTING TO INDUSTRIAL SCADA TELEMETRY BUS...
      </div>
    );
  }

  const { fleet_counts, machines, top_5_at_risk, active_alerts_count, lines = [] } = data;

  const filteredMachines = selectedLine === 'all'
    ? machines
    : machines.filter((m: any) => m.line_id === selectedLine);

  const getMachineColor = (m: any) => {
    if (colorMode === 'risk') {
      if (m.risk_score >= 0.8) return 'var(--fault)';
      if (m.risk_score >= 0.6) return 'var(--hivis)';
      if (m.risk_score >= 0.35) return 'var(--watch)';
      return 'var(--steel)';
    } else {
      if (m.health_index < 30) return 'var(--fault)';
      if (m.health_index < 55) return 'var(--hivis)';
      if (m.health_index < 75) return 'var(--watch)';
      return 'var(--steel)';
    }
  };

  // Group machines by lines for layout
  const lineGroups: Record<string, any[]> = {
    'line_1': machines.filter((m: any) => m.line_id === 'line_1' || m.name?.startsWith('PRESS-01') || m.name?.startsWith('MOTOR-02') || m.name?.startsWith('PUMP-03') || m.name?.startsWith('CONV-04')),
    'line_2': machines.filter((m: any) => m.line_id === 'line_2' || m.name?.startsWith('COMP-05') || m.name?.startsWith('PUMP-06') || m.name?.startsWith('GEAR-07') || m.name?.startsWith('MOTOR-08')),
    'line_3': machines.filter((m: any) => m.line_id === 'line_3' || m.name?.startsWith('PRESS-09') || m.name?.startsWith('COMP-10') || m.name?.startsWith('PUMP-11') || m.name?.startsWith('GEAR-12')),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* 1. FLEET HEALTH STATUS DIALS */}
      <Plate
        title="FLEET HEALTH STATUS // REAL-TIME CONDITION"
        badge="ONLINE"
        badgeColor="var(--steel)"
        actions={
          <button
            onClick={triggerScoreRun}
            disabled={scoring}
            className="bg-hivis hover:bg-hivis-deep text-graphite font-mono font-bold text-xs uppercase px-3.5 py-1.5 rounded shadow-xs tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {scoring && <span className="w-3.5 h-3.5 border-2 border-graphite border-t-transparent rounded-full animate-spin" />}
            {scoring ? 'Scoring Cycle Running...' : 'Run Scoring Cycle'}
          </button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DialGauge
            title="HEALTHY ASSETS"
            value={fleet_counts.healthy}
            min={0}
            max={fleet_counts.total || 12}
            unit={`/${fleet_counts.total || 12}`}
            statusText="ZONE A / NORMAL"
            tone="nominal"
          />
          <DialGauge
            title="WATCH (TRENDING)"
            value={fleet_counts.watch}
            min={0}
            max={fleet_counts.total || 12}
            unit="UNITS"
            statusText="INITIAL DRIFT"
            tone="watch"
          />
          <DialGauge
            title="ALERT (DEGRADED)"
            value={fleet_counts.alert}
            min={0}
            max={fleet_counts.total || 12}
            unit="UNITS"
            statusText="WARNING THRESHOLD"
            tone="alert"
          />
          <DialGauge
            title="CRITICAL (FAILURE RISK)"
            value={fleet_counts.critical}
            min={0}
            max={fleet_counts.total || 12}
            unit="UNITS"
            statusText="ACTION REQUIRED"
            tone="critical"
          />
        </div>
      </Plate>

      {/* 2. INTERACTIVE PLANT FLOOR MAP & ASSET GRID */}
      <Plate
        title="INTERACTIVE PLANT FLOOR // FLEET ASSET MATRIX"
        badge={`${filteredMachines.length} EQUIPMENT MONITORED`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            {/* View Mode Toggle */}
            <div className="flex bg-sheet border border-line p-0.5 rounded shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-hivis text-graphite shadow-xs' : 'text-graphite-3 hover:text-graphite'
                }`}
              >
                Bay Grid Matrix
              </button>
              <button
                onClick={() => setViewMode('schematic')}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  viewMode === 'schematic' ? 'bg-hivis text-graphite shadow-xs' : 'text-graphite-3 hover:text-graphite'
                }`}
              >
                SCADA Conveyor Map
              </button>
            </div>

            {/* Color by Metric Toggle */}
            <div className="flex bg-sheet border border-line p-0.5 rounded items-center shadow-2xs">
              <span className="text-[10px] text-graphite-3 px-1.5 uppercase font-bold">Metric:</span>
              <button
                onClick={() => setColorMode('risk')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                  colorMode === 'risk' ? 'bg-plate text-graphite' : 'text-graphite-3 hover:text-graphite'
                }`}
              >
                Risk %
              </button>
              <button
                onClick={() => setColorMode('health')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                  colorMode === 'health' ? 'bg-plate text-graphite' : 'text-graphite-3 hover:text-graphite'
                }`}
              >
                HI Score
              </button>
            </div>
          </div>
        }
      >
        <div className="pt-2">
          {viewMode === 'grid' ? (
            /* BAY GRID VIEW: Spacious, tactile cards grouped by production bay */
            <div className="space-y-6">
              {[
                { key: 'line_1', title: 'BAY A // LINE 1 — STAMPING & HYDRAULIC PRESSES', desc: 'Continuous High-Tonnage Forming', machines: lineGroups['line_1'] },
                { key: 'line_2', title: 'BAY B // LINE 2 — HEAVY DRIVES & SCREW COMPRESSORS', desc: 'Pneumatics & Prime Movers', machines: lineGroups['line_2'] },
                { key: 'line_3', title: 'BAY C // LINE 3 — ROTARY GEARS & PACKAGING', desc: 'High-Speed Gearboxes & Finishing', machines: lineGroups['line_3'] },
              ].map(bay => {
                const bayMachines = bay.machines || [];
                return (
                  <div key={bay.key} className="bg-plate/40 border border-line rounded-lg p-4 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-line/70 gap-1 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-steel animate-pulse" />
                        <span className="text-xs font-bold text-graphite tracking-wider uppercase">{bay.title}</span>
                        <span className="text-[10px] text-graphite-3 ml-2 hidden md:inline">({bay.desc})</span>
                      </div>
                      <span className="text-[10px] text-graphite-3 uppercase font-bold">
                        {bayMachines.length} Monitored Units • Live Loop Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {bayMachines.map((m: any) => {
                        const color = getMachineColor(m);
                        const isCrit = m.state === 'Critical';
                        const isAlert = m.state === 'Alert';
                        const riskPct = Math.round(m.risk_score * 100);

                        return (
                          <motion.div
                            key={m.id}
                            whileHover={{ scale: 1.025, y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/machines/${m.id}`)}
                            className={`bg-sheet border rounded-lg p-4 cursor-pointer transition-all shadow-xs relative overflow-hidden group ${
                              isCrit
                                ? 'border-fault shadow-fault/15 ring-2 ring-fault/40 bg-fault/5'
                                : isAlert
                                ? 'border-hivis shadow-hivis/10 ring-1 ring-hivis/40'
                                : 'border-line hover:border-graphite-2'
                            }`}
                          >
                            {/* Top critical animated radar ping beacon */}
                            {isCrit && (
                              <div className="absolute top-2.5 right-2.5 flex items-center justify-center">
                                <span className="w-3.5 h-3.5 rounded-full bg-fault animate-ping absolute opacity-75" />
                                <span className="w-2.5 h-2.5 rounded-full bg-fault relative" />
                              </div>
                            )}

                            {isAlert && (
                              <div className="absolute top-2.5 right-2.5 flex items-center justify-center">
                                <span className="w-3 h-3 rounded-full bg-hivis animate-ping absolute opacity-60" />
                                <span className="w-2 h-2 rounded-full bg-hivis relative" />
                              </div>
                            )}

                            <div className="flex items-start justify-between pr-4">
                              <div>
                                <div className="font-display font-black text-2xl text-graphite leading-none group-hover:text-hivis-deep transition-colors tracking-tight">
                                  {m.name}
                                </div>
                                <div className="font-mono text-[10px] text-graphite-3 uppercase mt-1">
                                  {m.type} • Tier {m.criticality}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                  isCrit
                                    ? 'bg-fault text-white'
                                    : isAlert
                                    ? 'bg-hivis text-graphite'
                                    : m.state === 'Watch'
                                    ? 'bg-watch/20 text-watch'
                                    : 'bg-steel/15 text-steel'
                                }`}
                              >
                                {m.state}
                              </span>
                            </div>

                            {/* Telemetry Micro-Gauges & Risk Bar */}
                            <div className="mt-3.5 pt-3 border-t border-line/60 space-y-2.5 font-mono text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-graphite-3 uppercase text-[10px] font-bold">Failure Risk (72h)</span>
                                <span className={`font-bold ${isCrit ? 'text-fault text-sm' : isAlert ? 'text-hivis-deep text-sm' : 'text-graphite'}`}>
                                  {riskPct}%
                                </span>
                              </div>
                              <div className="w-full bg-plate rounded-full h-2 overflow-hidden border border-line/40">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${riskPct}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-graphite-3 border-t border-line/40">
                                <div>
                                  Health Index: <strong className="text-graphite font-bold">{m.health_index}</strong>
                                </div>
                                <div className="text-right">
                                  RUL: <strong className="text-graphite font-bold">{m.rul_hours ? `${m.rul_hours}h` : 'Nominal'}</strong>
                                </div>
                              </div>

                              <div className="pt-1 flex items-center justify-between text-[10px]">
                                <span className="flex items-center gap-1 text-steel font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-steel animate-ping" />
                                  LIVE SENSORS
                                </span>
                                <span className="text-hivis-deep font-bold group-hover:underline">Passport Dossier →</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* CONVEYOR SCHEMATIC VIEW: Full-scale responsive SCADA conveyor diagram */
            <div className="relative w-full bg-plate border border-line rounded-lg p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-line/60 font-mono text-xs">
                <span className="text-graphite font-bold uppercase">PLANT AUTOMATION SCADA FLOW // CONTINUOUS CONVEYOR LINES</span>
                <span className="text-graphite-3 uppercase text-[11px]">Hover asset to inspect • Click to open passport</span>
              </div>

              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 1000 480" className="w-full min-w-[780px] h-auto select-none">
                  {/* Bay 1 Background Track */}
                  <rect x="20" y="20" width="960" height="130" fill="var(--sheet)" stroke="var(--line)" rx="6" />
                  <text x="35" y="44" fontSize="12" fontFamily="Share Tech Mono" fontWeight="700" fill="var(--graphite-2)">
                    BAY A // LINE 1 — STAMPING & HYDRAULIC PRESSES
                  </text>
                  <line x1="60" y1="95" x2="940" y2="95" stroke="var(--line)" strokeWidth="4" strokeDasharray="10 8" />

                  {/* Bay 2 Background Track */}
                  <rect x="20" y="170" width="960" height="130" fill="var(--sheet)" stroke="var(--line)" rx="6" />
                  <text x="35" y="194" fontSize="12" fontFamily="Share Tech Mono" fontWeight="700" fill="var(--graphite-2)">
                    BAY B // LINE 2 — HEAVY DRIVES & SCREW COMPRESSORS
                  </text>
                  <line x1="60" y1="245" x2="940" y2="245" stroke="var(--line)" strokeWidth="4" strokeDasharray="10 8" />

                  {/* Bay 3 Background Track */}
                  <rect x="20" y="320" width="960" height="130" fill="var(--sheet)" stroke="var(--line)" rx="6" />
                  <text x="35" y="344" fontSize="12" fontFamily="Share Tech Mono" fontWeight="700" fill="var(--graphite-2)">
                    BAY C // LINE 3 — ROTARY GEARS & PACKAGING
                  </text>
                  <line x1="60" y1="395" x2="940" y2="395" stroke="var(--line)" strokeWidth="4" strokeDasharray="10 8" />

                  {/* Machine Pods */}
                  {machines.map((m: any, idx: number) => {
                    const bayIndex = m.line_id === 'line_3' || idx >= 8 ? 2 : m.line_id === 'line_2' || idx >= 4 ? 1 : 0;
                    const colIndex = idx % 4;
                    const posX = 160 + colIndex * 220;
                    const posY = 95 + bayIndex * 150;
                    const color = getMachineColor(m);
                    const isCrit = m.state === 'Critical';
                    const isAlert = m.state === 'Alert';

                    return (
                      <g
                        key={m.id}
                        transform={`translate(${posX}, ${posY})`}
                        onClick={() => navigate(`/machines/${m.id}`)}
                        className="cursor-pointer group"
                      >
                        {/* Critical Pulse */}
                        {isCrit && (
                          <circle r="48" fill="none" stroke="var(--fault)" strokeWidth="2" className="animate-ping" />
                        )}

                        {/* Machine Pod Body */}
                        <rect
                          x="-85"
                          y="-38"
                          width="170"
                          height="76"
                          rx="6"
                          fill="var(--sheet)"
                          stroke={color}
                          strokeWidth={isCrit ? '3' : isAlert ? '2.5' : '1.5'}
                          className="transition-all hover:filter hover:drop-shadow-md"
                        />

                        {/* Machine Name */}
                        <text
                          x="-70"
                          y="-14"
                          fontSize="15"
                          fontFamily="Big Shoulders Display"
                          fontWeight="900"
                          fill="var(--graphite)"
                        >
                          {m.name}
                        </text>

                        {/* Type Label */}
                        <text
                          x="-70"
                          y="2"
                          fontSize="9"
                          fontFamily="Share Tech Mono"
                          fill="var(--graphite-3)"
                        >
                          {m.type?.slice(0, 18)}
                        </text>

                        {/* Metric Readings */}
                        <text
                          x="-70"
                          y="22"
                          fontSize="11"
                          fontFamily="Share Tech Mono"
                          fontWeight="700"
                          fill={color}
                        >
                          {colorMode === 'risk' ? `Risk: ${Math.round(m.risk_score * 100)}%` : `HI: ${m.health_index}`}
                        </text>

                        {/* State Pill */}
                        <rect
                          x="22"
                          y="-30"
                          width="55"
                          height="18"
                          rx="3"
                          fill={isCrit ? 'var(--fault)' : isAlert ? 'var(--hivis)' : 'var(--plate)'}
                        />
                        <text
                          x="49.5"
                          y="-18"
                          fontSize="8"
                          fontFamily="Share Tech Mono"
                          fontWeight="700"
                          textAnchor="middle"
                          fill={isCrit ? '#FFFFFF' : 'var(--graphite)'}
                        >
                          {m.state}
                        </text>

                        {/* Status Beacon */}
                        <circle cx="70" cy="22" r="5" fill={color} />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>
      </Plate>

      {/* 3. TWO ACTION PLATES: TOP 5 AT RISK & ACTIVE ALARMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 at Risk */}
        <Plate
          title="TOP 5 ASSETS AT RISK // PRIORITY ATTENTION"
          badge="72H HORIZON"
          badgeColor="var(--fault)"
        >
          <div className="divide-y divide-line">
            {top_5_at_risk.map((m: any, idx: number) => {
              const riskPct = Math.round((m.risk_score || 0.8) * 100);
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/machines/${m.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-plate/80 px-3 rounded-md cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-graphite-3 w-5">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-xs text-graphite flex items-center gap-2">
                        <span className="text-base font-display font-extrabold">{m.name}</span>
                        <span className="font-mono text-[10px] text-graphite-3 uppercase">({m.type})</span>
                      </div>
                      <div className="font-mono text-[10px] text-graphite-3 mt-0.5">
                        Criticality Tier {m.criticality || 4} • Health Score: {m.health_index}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-mono font-bold text-sm text-fault">{riskPct}% RISK</div>
                      <div className="font-mono text-[9px] text-graphite-3 uppercase">Next 72h window</div>
                    </div>
                    <StateBadge state={m.state as MachineState} />
                  </div>
                </div>
              );
            })}
          </div>
        </Plate>

        {/* Active Alarms */}
        <Plate
          title="ACTIVE INDUSTRIAL ALERTS // DEBOUNCED"
          badge={`${active_alerts_count} OPEN`}
          badgeColor="var(--hivis-deep)"
          actions={
            <button
              onClick={() => navigate('/office')}
              className="font-mono text-[11px] text-hivis-deep hover:underline font-bold"
            >
              Go to Review Queue →
            </button>
          }
        >
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-fault/10 border-l-4 border-fault rounded-r text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fault flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fault animate-ping" />
                  ▲ PRESS-01: Critical Vibration & Temperature Rise
                </span>
                <button
                  onClick={() => navigate('/office?machine_id=PRESS-01')}
                  className="px-2 py-0.5 bg-sheet border border-fault/60 text-fault font-bold text-[10px] rounded hover:bg-fault hover:text-white transition-colors"
                >
                  Review Alarm
                </button>
              </div>
              <div className="text-graphite-2 text-[11px]">
                Vibration RMS 11.2 mm/s exceeds ISO Zone D • Bearing Temp +33.5°C over baseline
              </div>
            </div>

            <div className="p-3 bg-hivis/10 border-l-4 border-hivis rounded-r text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-hivis-deep flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-hivis animate-ping" />
                  ▲ COMP-05: High-Frequency Energy Spike
                </span>
                <button
                  onClick={() => navigate('/office?machine_id=COMP-05')}
                  className="px-2 py-0.5 bg-sheet border border-hivis/60 text-hivis-deep font-bold text-[10px] rounded hover:bg-hivis hover:text-graphite transition-colors"
                >
                  Review Alarm
                </button>
              </div>
              <div className="text-graphite-2 text-[11px]">
                FFT Band 3 Energy elevated • Potential oil seal lubrication loss
              </div>
            </div>
          </div>
        </Plate>
      </div>
    </motion.div>
  );
};
