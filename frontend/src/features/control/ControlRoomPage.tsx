import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { LabelTape } from '../../components/LabelTape';
import { StripChartRecorder } from '../../components/StripChartRecorder';
import { apiRequest } from '../../lib/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area } from 'recharts';

export const ControlRoomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initMachine = searchParams.get('machine_a') || '';

  const [activeTab, setActiveTab] = useState<'stripchart' | 'compare' | 'events'>('stripchart');
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>(initMachine);
  const [machineData, setMachineData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compare Mode State
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [compareSensor, setCompareSensor] = useState<string>('vibration_rms_mm_s');
  const [compareResults, setCompareResults] = useState<any>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Events Aligned State
  const [eventSensor, setEventSensor] = useState<string>('vibration');
  const [eventData, setEventData] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    apiRequest('/machines').then(res => {
      setMachines(res);
      if (res.length > 0) {
        if (!selectedMachine) setSelectedMachine(res[0].id);
        setCompareA(res[0].id);
        if (res.length > 1) setCompareB(res[1].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;
    setLoading(true);
    Promise.all([
      apiRequest(`/machines/${selectedMachine}`),
      apiRequest(`/trends/readings?machine_id=${selectedMachine}&limit=120`),
    ]).then(([m, tr]) => {
      setMachineData(m);
      setTrends(tr);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedMachine]);

  const runCompare = async () => {
    if (!compareA || !compareB) return;
    setLoadingCompare(true);
    try {
      const res = await apiRequest(`/trends/compare?machine_a=${compareA}&machine_b=${compareB}&sensor_type=${compareSensor}`);
      setCompareResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompare(false);
    }
  };

  const fetchEventsAligned = async () => {
    setLoadingEvents(true);
    try {
      const res = await apiRequest(`/trends/events-aligned?sensor_type=${eventSensor}`);
      setEventData(res.t_minus_trend || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'compare') {
      runCompare();
    } else if (activeTab === 'events') {
      fetchEventsAligned();
    }
  }, [activeTab, compareSensor, eventSensor]);

  // StripChart data conversion
  const chartData = trends.map(t => {
    const d = new Date(t.ts);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const row: any = { time: timeStr };
    if (t.readings) {
      Object.keys(t.readings).forEach(k => {
        row[k] = t.readings[k];
      });
    }
    return row;
  });

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
            <LabelTape text="ROOM 2 // RECORDER BANK" color="var(--hivis)" />
            <span className="font-mono text-xs text-graphite-3 uppercase tracking-wider">
              TELEMETRY STRIP CHARTS, MACHINE A/B COMPARE, T-MINUS ALIGNED
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-graphite uppercase mt-1">
            Control Room & Trends
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-sheet border border-line p-1 rounded font-mono text-xs shadow-2xs">
          <button
            onClick={() => setActiveTab('stripchart')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'stripchart' ? 'bg-hivis text-graphite font-bold shadow-xs' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Strip-Chart Recorder
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'compare' ? 'bg-hivis text-graphite font-bold shadow-xs' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            A/B Asset Overlay
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'events' ? 'bg-hivis text-graphite font-bold shadow-xs' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Event-Aligned Degradation
          </button>
        </div>
      </div>

      {/* TAB 1: STRIP CHART RECORDER */}
      {activeTab === 'stripchart' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Plate
            title="ACTIVE ASSET SELECTOR"
            actions={
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-graphite-3 uppercase font-bold">Equipment Channel:</span>
                <select
                  value={selectedMachine}
                  onChange={e => setSelectedMachine(e.target.value)}
                  className="bg-sheet border border-line px-3 py-1.5 rounded text-xs font-mono font-bold text-graphite focus:border-hivis outline-none cursor-pointer"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} [{m.type}] — {m.state}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {loading ? (
              <div className="py-12 font-mono text-xs text-graphite-3 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
                TUNING TO SELECTED EQUIPMENT TELEMETRY STREAM...
              </div>
            ) : (
              <StripChartRecorder
                data={chartData}
                title={`RECORDER TAPE // ${machineData?.name || 'EQUIPMENT'} (24H BUFFER)`}
                sensors={[
                  { key: 'vibration_rms_mm_s', name: 'Vibration RMS', unit: 'mm/s', color: 'var(--fault)', baseline: 2.5, alertThreshold: 4.5 },
                  { key: 'bearing_temp_c', name: 'Bearing Temp', unit: '°C', color: 'var(--watch)', baseline: 55.0, alertThreshold: 75.0 },
                  { key: 'motor_current_a', name: 'Motor Current', unit: 'A', color: 'var(--teal)', baseline: 62.0, alertThreshold: 72.0 },
                  { key: 'pressure_bar', name: 'Pressure', unit: 'bar', color: 'var(--steel)', baseline: 6.8, alertThreshold: 7.8 },
                  { key: 'speed_rpm', name: 'Drive Speed', unit: 'rpm', color: 'var(--graphite-2)', baseline: 1480.0, alertThreshold: 1550.0 },
                ]}
              />
            )}
          </Plate>
        </motion.div>
      )}

      {/* TAB 2: A/B COMPARE */}
      {activeTab === 'compare' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Plate title="A/B OVERLAY CONFIGURATION">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 font-mono text-xs items-end">
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase font-bold mb-1">Asset A (Reference)</label>
                <select
                  value={compareA}
                  onChange={e => setCompareA(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-graphite focus:border-hivis outline-none font-bold"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-graphite-3 uppercase font-bold mb-1">Asset B (Compare Target)</label>
                <select
                  value={compareB}
                  onChange={e => setCompareB(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-graphite focus:border-hivis outline-none font-bold"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-graphite-3 uppercase font-bold mb-1">Sensor Channel</label>
                <select
                  value={compareSensor}
                  onChange={e => setCompareSensor(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-graphite focus:border-hivis outline-none font-bold"
                >
                  <option value="vibration_rms_mm_s">Vibration RMS (mm/s)</option>
                  <option value="bearing_temp_c">Bearing Temp (°C)</option>
                  <option value="motor_current_a">Motor Current (A)</option>
                  <option value="pressure_bar">Pressure (bar)</option>
                  <option value="speed_rpm">Drive Speed (RPM)</option>
                </select>
              </div>

              <div>
                <button
                  onClick={runCompare}
                  disabled={loadingCompare}
                  className="w-full py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                >
                  {loadingCompare ? 'Rendering...' : 'Plot Comparison'}
                </button>
              </div>
            </div>
          </Plate>

          <Plate
            title={`A/B OVERLAY TRACE // ${compareResults?.machine_a || 'MACHINE A'} VS ${compareResults?.machine_b || 'MACHINE B'}`}
            badge={compareResults?.points ? `${compareResults.points.length} OVERLAID SAMPLES` : 'READY'}
          >
            <div className="pt-2 h-80 w-full font-mono text-xs">
              {loadingCompare ? (
                <div className="h-full flex items-center justify-center gap-2 text-graphite-3">
                  <span className="w-4 h-4 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
                  CORRELATING ASSET CHANNELS...
                </div>
              ) : compareResults && compareResults.points ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compareResults.points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="index" stroke="var(--graphite-3)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--graphite-3)" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--sheet)',
                        borderColor: 'var(--line)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'Share Tech Mono',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="value_a" name={`${compareResults.machine_a} (A)`} stroke="var(--steel)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="value_b" name={`${compareResults.machine_b} (B)`} stroke="var(--hivis)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-graphite-3 font-mono">
                  Select two machines above and click 'Plot Comparison'.
                </div>
              )}
            </div>
          </Plate>
        </motion.div>
      )}

      {/* TAB 3: EVENT-ALIGNED DEGRADATION */}
      {activeTab === 'events' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Plate
            title="EVENT-ALIGNED DEGRADATION // HISTORICAL T-MINUS FAILURE OVERLAY"
            actions={
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-graphite-3 uppercase font-bold">Sensor:</span>
                <select
                  value={eventSensor}
                  onChange={e => setEventSensor(e.target.value)}
                  className="bg-sheet border border-line px-2 py-1 rounded text-xs font-mono font-bold text-graphite focus:border-hivis outline-none"
                >
                  <option value="vibration">Vibration RMS</option>
                  <option value="temperature">Bearing Temperature</option>
                  <option value="current">Motor Current</option>
                </select>
              </div>
            }
          >
            <div className="pt-2 h-80 w-full font-mono text-xs">
              {loadingEvents ? (
                <div className="h-full flex items-center justify-center gap-2 text-graphite-3">
                  <span className="w-4 h-4 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
                  ALIGNING FAILURE TIMELINES TO T=0...
                </div>
              ) : eventData && eventData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eventData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="t_hours" stroke="var(--graphite-3)" tick={{ fontSize: 10 }} label={{ value: 'Hours to Failure (T=0)', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="var(--graphite-3)" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--sheet)',
                        borderColor: 'var(--line)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'Share Tech Mono',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="p90" name="90th Percentile Risk" stroke="var(--fault)" fill="var(--fault)" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="median" name="Median Trajectory" stroke="var(--hivis)" fill="var(--hivis)" fillOpacity={0.25} />
                    <Area type="monotone" dataKey="p10" name="10th Percentile" stroke="var(--steel)" fill="var(--steel)" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-graphite-3 font-mono">
                  Loading aligned event traces...
                </div>
              )}
            </div>
          </Plate>
        </motion.div>
      )}
    </motion.div>
  );
};
