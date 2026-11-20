import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { LabelTape } from '../../components/LabelTape';
import { apiRequest } from '../../lib/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from 'recharts';

export const BenchPage: React.FC = () => {
  const [benchData, setBenchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.48);

  // Failure Replay scrubber
  const [replayEvents, setReplayEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('ev_001');
  const [scrubberDay, setScrubberDay] = useState<number>(-5);

  useEffect(() => {
    apiRequest('/evaluations').then(res => {
      setBenchData(res);
      if (res.scoreboard && res.scoreboard.length > 0) {
        setSelectedModel(res.scoreboard[0].name);
      }
    }).catch(console.error)
      .finally(() => setLoading(false));

    // Demo failure events
    setReplayEvents([
      { id: 'ev_001', machine: 'PRESS-01', failure_mode: 'Bearing Fatigue Spall', date: '2026-11-05' },
      { id: 'ev_002', machine: 'PUMP-03', failure_mode: 'Cavitation & Seal Breakdown', date: '2026-10-22' },
    ]);
  }, []);

  if (loading || !benchData) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center gap-3 font-mono text-xs text-graphite-3 min-h-[60vh]">
        <span className="w-5 h-5 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
        LOADING MODEL BENCH & EVALUATION SCOREBOARD...
      </div>
    );
  }

  const { scoreboard = [], pr_curves = {}, cost_curves = {}, lead_times = [] } = benchData;
  const currentPRCurve = pr_curves[selectedModel] || [];
  const currentCostCurve = cost_curves[selectedModel] || [];

  // Dynamic cost calculation based on slider
  const estimatedCost = Math.round(18000 + Math.pow(Math.abs(threshold - 0.48) * 10, 2) * 12000);
  const falseAlarmRate = (3.2 * (1 - threshold)).toFixed(1);

  // Replay frame calculation
  const replayRisk = Math.min(0.99, Math.max(0.08, 0.15 + Math.pow(Math.abs(scrubberDay) / 10 - 1, 2) * 0.85));
  const replayVib = (2.2 + Math.pow(Math.abs(scrubberDay) / 10 - 1, 2) * 8.5).toFixed(2);
  const replayTemp = (55 + Math.pow(Math.abs(scrubberDay) / 10 - 1, 2) * 35).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Title Tape */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <LabelTape text="ROOM 5 // EVALUATION BENCH" color="var(--steel)" />
            <span className="font-mono text-xs text-graphite-3 uppercase tracking-wider">
              SCOREBOARD, COST-OPTIMAL THRESHOLDS & HISTORICAL FAILURE REPLAY
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-graphite uppercase mt-1">
            Bench & Model Evaluation
          </h1>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-graphite-3 uppercase font-bold">Active Focus:</span>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="bg-sheet border border-line px-3 py-1.5 rounded font-bold text-graphite focus:border-hivis outline-none cursor-pointer shadow-2xs"
          >
            {scoreboard.map((m: any) => (
              <option key={m.id} value={m.name}>{m.name} ({m.family})</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. SCOREBOARD COMPARED AGAINST BASELINES */}
      <Plate title="MODEL SCOREBOARD // CHAMPION VS BASELINE CONTROL RULES">
        <div className="overflow-x-auto pt-1 font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-graphite-3 text-[10px] uppercase font-bold">
                <th className="py-2.5 px-3">Detector Candidate</th>
                <th className="py-2.5 px-3">Type / Family</th>
                <th className="py-2.5 px-3">PR-AUC</th>
                <th className="py-2.5 px-3">Recall @ Opt</th>
                <th className="py-2.5 px-3">F1 Score</th>
                <th className="py-2.5 px-3">False Alarms/Mo</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {scoreboard.map((m: any, idx: number) => (
                <tr
                  key={idx}
                  className={`hover:bg-plate/60 transition-colors ${
                    m.name === selectedModel ? 'bg-hivis/5 font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-graphite flex items-center gap-2">
                    {m.name === selectedModel && <span className="w-2 h-2 rounded-full bg-hivis animate-pulse" />}
                    {m.name}
                  </td>
                  <td className="py-2.5 px-3 text-graphite-2">{m.family}</td>
                  <td className="py-2.5 px-3 text-graphite font-bold">{m.pr_auc?.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-graphite font-bold">{Math.round((m.recall || 0.8) * 100)}%</td>
                  <td className="py-2.5 px-3 text-graphite-2">{m.f1?.toFixed(3) || '0.785'}</td>
                  <td className="py-2.5 px-3 text-graphite">{m.false_alarms_per_month}/mo</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      m.status === 'active'
                        ? 'bg-hivis text-graphite shadow-2xs'
                        : 'bg-steel/10 text-steel'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Baseline Static Rule */}
              <tr className="hover:bg-plate/40 text-graphite-3">
                <td className="py-2 px-3 italic">Baseline: Static Threshold (&gt;4.5mm/s)</td>
                <td className="py-2 px-3">Fixed Rule</td>
                <td className="py-2 px-3">0.420</td>
                <td className="py-2 px-3">52%</td>
                <td className="py-2 px-3">0.480</td>
                <td className="py-2 px-3 text-fault font-bold">8.4/mo</td>
                <td className="py-2 px-3">Reference</td>
              </tr>
              {/* Baseline Control Chart */}
              <tr className="hover:bg-plate/40 text-graphite-3">
                <td className="py-2 px-3 italic">Baseline: 3-Sigma EWMA Control Chart</td>
                <td className="py-2 px-3">Statistical SPC</td>
                <td className="py-2 px-3">0.590</td>
                <td className="py-2 px-3">68%</td>
                <td className="py-2 px-3">0.610</td>
                <td className="py-2 px-3 text-watch font-bold">4.1/mo</td>
                <td className="py-2 px-3">Reference</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Plate>

      {/* 2. PR CURVE & COST CURVE WITH THRESHOLD SLIDER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Plate title={`PRECISION-RECALL (PR) CURVE // ${selectedModel}`}>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentPRCurve} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="recall"
                  type="number"
                  domain={[0, 1]}
                  stroke="var(--graphite-3)"
                  fontSize={11}
                  label={{ value: 'Recall', position: 'insideBottom', offset: -10, fill: 'var(--graphite-2)', fontSize: 11 }}
                />
                <YAxis
                  dataKey="precision"
                  type="number"
                  domain={[0, 1]}
                  stroke="var(--graphite-3)"
                  fontSize={11}
                  label={{ value: 'Precision', angle: -90, position: 'insideLeft', fill: 'var(--graphite-2)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--sheet)', borderColor: 'var(--line)', fontFamily: 'Share Tech Mono', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke="var(--hivis)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--graphite)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Plate>

        <Plate
          title={`OPERATIONAL COST CURVE // THRESHOLD OPTIMIZATION`}
          badge={`OPTIMAL: τ = ${threshold}`}
        >
          <div className="space-y-4 pt-1 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-graphite-2">
              <span className="font-bold">Intervention Threshold (τ):</span>
              <span className="font-display font-black text-hivis text-lg">{threshold}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.8"
              step="0.02"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-hivis cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-graphite-3">
              <span>0.20 (Over-Alarming)</span>
              <span className="text-hivis font-bold">Optimal Range: [0.45 – 0.52]</span>
              <span>0.80 (Uncaught Breakdown)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-2.5 bg-plate rounded border border-line text-xs font-mono">
              <div>
                <span className="text-[10px] text-graphite-3 uppercase">Expected Monthly Cost</span>
                <div className="font-display font-black text-xl text-graphite mt-0.5">
                  ${estimatedCost.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-graphite-3 uppercase">False Alarms</span>
                <div className="font-display font-black text-xl text-teal mt-0.5">
                  {falseAlarmRate}/month
                </div>
              </div>
            </div>

            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentCostCurve} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="threshold" stroke="var(--graphite-3)" fontSize={10} />
                  <YAxis
                    stroke="var(--graphite-3)"
                    fontSize={10}
                    tickFormatter={v => `$${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--sheet)', borderColor: 'var(--line)', fontFamily: 'Share Tech Mono', fontSize: '10px' }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Expected Cost']}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="var(--fault)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--fault)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Plate>
      </div>

      {/* 3. FAILURE REPLAY PLAYER */}
      <Plate title="FAILURE REPLAY PLAYER // STEP THROUGH HISTORICAL DEGRADATION EVENT">
        <div className="space-y-4 pt-1 font-mono text-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-3">
              <span className="text-graphite-3 uppercase font-bold">Selected Event:</span>
              <select
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
                className="bg-sheet border border-line p-1.5 rounded font-bold text-graphite focus:border-hivis outline-none cursor-pointer"
              >
                {replayEvents.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.machine} — {e.failure_mode} ({e.date})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-graphite-3">
              SCRUBBER POSITION: <strong className="text-graphite font-bold">T {scrubberDay} DAYS</strong> (T=0 IS FAILURE)
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-graphite-3 uppercase font-bold">
              <span>T-10 Days (Nominal Base)</span>
              <span>T-5 Days (Degradation Phase)</span>
              <span className="text-fault">T-0 Days (Functional Breakdown)</span>
            </div>
            <input
              type="range"
              min="-10"
              max="0"
              step="0.5"
              value={scrubberDay}
              onChange={e => setScrubberDay(parseFloat(e.target.value))}
              className="w-full accent-hivis cursor-pointer"
            />
          </div>

          {/* Snapshot Telemetry at Current Scrubber Point */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-plate p-3.5 rounded-lg border border-line">
              <div className="text-[10px] text-graphite-3 uppercase font-bold">Failure Probability</div>
              <div className={`font-display font-black text-2xl mt-1 ${replayRisk >= 0.6 ? 'text-fault' : 'text-graphite'}`}>
                {Math.round(replayRisk * 100)}%
              </div>
              <div className="text-[10px] text-graphite-3 mt-0.5">
                {replayRisk >= 0.5 ? 'CRITICAL ALARM ACTIVE' : 'NOMINAL RANGE'}
              </div>
            </div>

            <div className="bg-plate p-3.5 rounded-lg border border-line">
              <div className="text-[10px] text-graphite-3 uppercase font-bold">Vibration RMS</div>
              <div className="font-display font-black text-2xl mt-1 text-graphite">
                {replayVib} <span className="text-xs font-mono font-normal">mm/s</span>
              </div>
              <div className="text-[10px] text-graphite-3 mt-0.5">
                Baseline: 2.35 mm/s
              </div>
            </div>

            <div className="bg-plate p-3.5 rounded-lg border border-line">
              <div className="text-[10px] text-graphite-3 uppercase font-bold">Bearing Temperature</div>
              <div className="font-display font-black text-2xl mt-1 text-graphite">
                {replayTemp} <span className="text-xs font-mono font-normal">°C</span>
              </div>
              <div className="text-[10px] text-graphite-3 mt-0.5">
                Baseline: 55.0 °C
              </div>
            </div>

            <div className="bg-plate p-3.5 rounded-lg border border-line">
              <div className="text-[10px] text-graphite-3 uppercase font-bold">Earliest Warning Lead</div>
              <div className="font-display font-black text-2xl mt-1 text-teal">
                4.2 Days
              </div>
              <div className="text-[10px] text-graphite-3 mt-0.5">
                Action window available
              </div>
            </div>
          </div>
        </div>
      </Plate>
    </motion.div>
  );
};
