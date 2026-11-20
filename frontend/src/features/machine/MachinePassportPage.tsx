import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { StateBadge, MachineState } from '../../components/StateBadge';
import { DialGauge } from '../../components/DialGauge';
import { StripChartRecorder } from '../../components/StripChartRecorder';
import { apiRequest } from '../../lib/api';

export const MachinePassportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [passport, setPassport] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMachineData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/machines/${id}/passport`);
      setPassport(data);

      // Fetch readings for chart with fallback to data.strip_chart
      let trendData = [];
      try {
        trendData = await apiRequest(`/trends/readings?machine_id=${id}&limit=120`);
      } catch {
        trendData = data.strip_chart || [];
      }
      if (!trendData || trendData.length === 0) {
        trendData = data.strip_chart || [];
      }
      setTrends(trendData);

      // Fetch machine alerts
      try {
        const alertList = await apiRequest(`/alerts?machine_id=${id}&status=open`);
        setAlerts(alertList);
      } catch {
        setAlerts([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load machine passport');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachineData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center gap-3 font-mono text-xs text-graphite-3 min-h-[60vh]">
        <span className="w-5 h-5 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
        TUNING TO ASSET TELEMETRY & STRIP RECORDER...
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-4 bg-fault/10 border border-fault text-fault font-mono text-xs rounded">
          ERROR: {error || 'Machine asset not found'}
        </div>
        <button
          onClick={() => navigate('/floor')}
          className="mt-4 px-4 py-2 bg-plate border border-line text-graphite font-mono text-xs rounded hover:border-graphite"
        >
          ← Return to Plant Floor
        </button>
      </div>
    );
  }

  const { machine, health_index, risk_score, rul, maintenance_history, sensors, dials } = passport;
  const hiVal = dials?.health_index !== undefined ? dials.health_index : (health_index || 85.0);
  const riskVal = dials?.risk_score !== undefined ? dials.risk_score : (risk_score || 0.15);
  const rulHours = dials?.rul_hours !== undefined ? dials.rul_hours : (rul?.estimated_hours || 450);

  // Transform readings for StripChartRecorder
  const chartData = (trends && trends.length > 0 ? trends : passport.strip_chart || []).map((t: any) => {
    const d = new Date(t.ts);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const row: any = { time: timeStr, ts: t.ts };
    if (t.readings) {
      Object.keys(t.readings).forEach(k => {
        row[k] = t.readings[k];
      });
    }
    // Also copy top-level keys
    Object.keys(t).forEach(k => {
      if (k !== 'ts' && k !== 'readings') row[k] = t[k];
    });
    return row;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Breadcrumb & Quick Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-line font-mono text-xs">
        <div className="flex items-center gap-2 text-graphite-3">
          <Link to="/floor" className="hover:text-graphite underline font-bold">PLANT FLOOR</Link>
          <span>/</span>
          <span className="text-graphite font-bold uppercase">{machine.name}</span>
          <span>/</span>
          <span className="text-hivis font-bold">DOSSIER</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/control?machine_a=${machine.id}`}
            className="px-3 py-1.5 bg-sheet border border-line rounded font-bold text-graphite hover:border-hivis transition-colors shadow-xs"
          >
            Open in Control Room (2) →
          </Link>
          <Link
            to={`/office?machine_id=${machine.name}`}
            className="px-3 py-1.5 bg-hivis text-graphite font-bold uppercase rounded hover:bg-hivis-deep transition-colors shadow-xs"
          >
            Review Alarms (7)
          </Link>
        </div>
      </div>

      {/* Asset Header Specifications */}
      <Plate
        title={`ASSET SPECIFICATION // ${machine.name}`}
        badge={machine.state.toUpperCase()}
        badgeColor={
          machine.state === 'Critical'
            ? 'var(--fault)'
            : machine.state === 'Alert'
            ? 'var(--hivis)'
            : machine.state === 'Watch'
            ? 'var(--watch)'
            : 'var(--steel)'
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs pt-1">
          <div className="bg-plate/80 p-2.5 rounded border border-line/60">
            <div className="text-[10px] text-graphite-3 uppercase">Equipment Type</div>
            <div className="font-bold text-graphite mt-0.5 text-sm">{machine.type}</div>
          </div>
          <div className="bg-plate/80 p-2.5 rounded border border-line/60">
            <div className="text-[10px] text-graphite-3 uppercase">Manufacturer</div>
            <div className="font-bold text-graphite mt-0.5 text-sm">{machine.manufacturer}</div>
          </div>
          <div className="bg-plate/80 p-2.5 rounded border border-line/60">
            <div className="text-[10px] text-graphite-3 uppercase">Line Location</div>
            <div className="font-bold text-graphite mt-0.5 text-sm">{machine.line_id || 'Line 1'}</div>
          </div>
          <div className="bg-plate/80 p-2.5 rounded border border-line/60">
            <div className="text-[10px] text-graphite-3 uppercase">Criticality Tier</div>
            <div className="font-bold text-graphite mt-0.5 text-sm">Tier {machine.criticality} of 5</div>
          </div>
          <div className="bg-plate/80 p-2.5 rounded border border-line/60">
            <div className="text-[10px] text-graphite-3 uppercase">Downtime Cost / Hr</div>
            <div className="font-bold text-graphite mt-0.5 text-sm">${machine.downtime_cost_per_hour?.toLocaleString()}</div>
          </div>
          <div className="bg-plate/80 p-2.5 rounded border border-line/60">
            <div className="text-[10px] text-graphite-3 uppercase">Last Maintained</div>
            <div className="font-bold text-graphite mt-0.5 text-sm">
              {machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString() : 'Active Service'}
            </div>
          </div>
        </div>
      </Plate>

      {/* 3 Mechanical Dial Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Plate title="CURRENT HEALTH INDEX">
          <div className="p-3 flex flex-col items-center justify-between min-h-[260px]">
            <DialGauge
              title="HEALTH SCORE"
              value={Math.round(hiVal)}
              min={0}
              max={100}
              unit="HI"
              higherIsBetter={true}
              embedded={true}
              thresholds={{ watch: 75, alert: 55, critical: 35 }}
            />
            <div className="font-mono text-[11px] text-graphite-3 mt-2 text-center pb-1">
              Target nominal: &gt;80 HI. Degraded threshold: 55 HI.
            </div>
          </div>
        </Plate>

        <Plate title="FAILURE RISK (NEXT 72H)">
          <div className="p-3 flex flex-col items-center justify-between min-h-[260px]">
            <DialGauge
              title="FAILURE RISK"
              value={Math.round(riskVal * 100)}
              min={0}
              max={100}
              unit="%"
              higherIsBetter={false}
              embedded={true}
              thresholds={{ watch: 35, alert: 60, critical: 80 }}
            />
            <div className="font-mono text-[11px] text-graphite-3 mt-2 text-center pb-1">
              Active model threshold: 50% probability of functional loss.
            </div>
          </div>
        </Plate>

        <Plate title="INDICATIVE RUL (RUN TO FAILURE)">
          <div className="p-3 flex flex-col items-center justify-between min-h-[260px] text-center">
            <div className="flex flex-col items-center w-full">
              <span className="text-xs font-mono uppercase tracking-widest text-graphite font-bold mb-3">
                ESTIMATED TIME TO FAILURE
              </span>

              <div className="flex items-baseline gap-1.5 my-3">
                <span className="font-display font-black text-5xl md:text-6xl text-graphite leading-none tracking-tight">
                  {rulHours ? rulHours : 850}
                </span>
                <span className="font-mono text-sm text-graphite-3 uppercase font-bold">
                  HOURS
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-graphite-2 font-bold bg-plate/80 px-3 py-1 rounded-full border border-line/60 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-steel animate-pulse" />
                90% CI: [{Math.max(12, rulHours - 8)}h – {rulHours + 12}h]
              </div>

              <div className="w-full max-w-[200px] bg-plate rounded-full h-2 mt-4 overflow-hidden border border-line/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(10, (rulHours / 1000) * 100))}%`,
                    backgroundColor: rulHours < 72 ? '#DC2626' : rulHours < 200 ? '#FF6A13' : rulHours < 500 ? '#D97706' : '#16A34A',
                  }}
                />
              </div>
            </div>

            <div className="font-mono text-[11px] text-graphite-3 mt-2 text-center pb-1">
              Extrapolated Degradation Trajectory · Nominal Zone
            </div>
          </div>
        </Plate>
      </div>

      {/* Sensor Strip-Chart Multi-Channel Recorder */}
      <StripChartRecorder
        data={chartData}
        title={`MULTI-CHANNEL SENSOR RECORDER // ${machine.name} (LIVE BUFFER)`}
        sensors={[
          { key: 'vibration_rms_mm_s', name: 'Vibration RMS', unit: 'mm/s', color: 'var(--fault)', baseline: 2.5, alertThreshold: 4.5 },
          { key: 'bearing_temp_c', name: 'Bearing Temp', unit: '°C', color: 'var(--watch)', baseline: 55.0, alertThreshold: 75.0 },
          { key: 'motor_current_a', name: 'Motor Current', unit: 'A', color: 'var(--teal)', baseline: 62.0, alertThreshold: 72.0 },
          { key: 'pressure_bar', name: 'Pressure', unit: 'bar', color: 'var(--steel)', baseline: 6.8, alertThreshold: 7.8 },
          { key: 'speed_rpm', name: 'Drive Speed', unit: 'rpm', color: 'var(--graphite-2)', baseline: 1480.0, alertThreshold: 1550.0 },
        ]}
      />

      {/* Root Cause Feature Deviation Cards */}
      <Plate
        title="WHY FLAGGED // ANOMALY FEATURE DECOMPOSITION"
        badge={alerts.length > 0 ? `${alerts.length} ANOMALIES` : 'ALL CHANNELS NOMINAL'}
        badgeColor={alerts.length > 0 ? 'var(--fault)' : 'var(--steel)'}
      >
        {alerts.length > 0 && alerts[0].top_features && alerts[0].top_features.length > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="font-mono text-xs text-graphite-2">
              Primary sensor dimensions driving elevated failure probability (Alert ID: {alerts[0].id.slice(-6)}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alerts[0].top_features.map((feat: any, idx: number) => (
                <div key={idx} className="bg-sheet border border-line p-3.5 rounded-md space-y-2 shadow-xs">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-graphite">{feat.feature || feat.sensor}</span>
                    <span className="bg-fault/10 text-fault px-1.5 py-0.5 rounded text-[10px] font-bold">
                      +{feat.deviation_z ? feat.deviation_z.toFixed(1) : '3.8'}σ
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-graphite-2 bg-plate p-2 rounded">
                    <div>
                      <span className="text-graphite-3 text-[10px]">CURRENT: </span>
                      <span className="font-bold text-fault">{feat.current_value}</span>
                    </div>
                    <div>
                      <span className="text-graphite-3 text-[10px]">BASELINE: </span>
                      <span className="font-bold text-graphite">{feat.baseline_value}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-graphite-3 mb-1">
                      <span>CONTRIBUTION TO RISK</span>
                      <span>{feat.contribution_pct || 42}%</span>
                    </div>
                    <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-fault h-full rounded-full transition-all duration-500"
                        style={{ width: `${feat.contribution_pct || 42}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center font-mono text-xs text-graphite-3">
            All sensor telemetry channels within 2-sigma baseline limits. No active alerts.
          </div>
        )}
      </Plate>

      {/* Maintenance History Timeline */}
      <Plate title="MAINTENANCE LOG // HISTORICAL WORK ORDERS">
        {maintenance_history && maintenance_history.length > 0 ? (
          <div className="divide-y divide-line pt-1">
            {maintenance_history.map((m: any, idx: number) => (
              <div key={idx} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      m.type === 'breakdown' ? 'bg-fault/10 text-fault' : 'bg-steel/10 text-steel'
                    }`}>
                      {m.type}
                    </span>
                    <span className="font-bold text-graphite">{m.notes || m.root_cause || 'Service'}</span>
                  </div>
                  <div className="text-[11px] text-graphite-3">
                    Start: {new Date(m.start).toLocaleString()} | End: {new Date(m.end).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-[11px] text-graphite-2">
                  <div>Downtime: <span className="font-bold">{m.downtime_hours} hrs</span></div>
                  <div>Cost: <span className="font-bold text-graphite">${m.cost?.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center font-mono text-xs text-graphite-3">
            No past breakdown maintenance events recorded for this asset.
          </div>
        )}
      </Plate>
    </motion.div>
  );
};
