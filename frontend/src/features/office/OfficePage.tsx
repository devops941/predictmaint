import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { LabelTape } from '../../components/LabelTape';
import { ThreeWaySelector, ReviewOutcome } from '../../components/ThreeWaySelector';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';

export const OfficePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initMachineId = searchParams.get('machine_id');

  const [activeTab, setActiveTab] = useState<'plan' | 'review' | 'admin'>('plan');

  // Plan State
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Review State
  const [openAlerts, setOpenAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>('needs_check');
  const [rootCause, setRootCause] = useState('Impeller wear / bearing race microspall');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Admin Config State
  const [config, setConfig] = useState<any>({
    default_horizon_hours: 72,
    default_cost_miss: 50000,
    default_cost_false: 2000,
    upload_max_mb: 25,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  const fetchPlan = async () => {
    try {
      const data = await apiRequest('/plan');
      setPlanItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const data = await apiRequest('/alerts?status=open');
      setOpenAlerts(data);
      if (data.length > 0) {
        if (initMachineId) {
          const match = data.find((a: any) => a.machine_name === initMachineId || a.machine_id === initMachineId);
          setSelectedAlert(match || data[0]);
          setActiveTab('review');
        } else {
          setSelectedAlert(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    if (user?.role !== 'Admin') return;
    try {
      const [cfg, logs, users] = await Promise.all([
        apiRequest('/config'),
        apiRequest('/audit/logs'),
        apiRequest('/users'),
      ]);
      setConfig(cfg);
      setAuditLogs(logs);
      setUsersList(users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlan();
    fetchAlerts();
    if (user?.role === 'Admin') {
      fetchAdminData();
    }
  }, []);

  const handleApprovePlanItem = async (id: string) => {
    try {
      await apiRequest(`/plan/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      });
      fetchPlan();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmittingReview(true);
    setReviewSuccess(null);
    try {
      await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          alert_id: selectedAlert.id,
          outcome: reviewOutcome,
          root_cause: rootCause,
          notes: reviewNotes,
        }),
      });
      setReviewSuccess(`Feedback logged for ${selectedAlert.machine_name}. Alert closed.`);
      setReviewNotes('');
      fetchAlerts();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await apiRequest('/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setAdminMsg('System configuration and operational costs updated.');
    } catch (err: any) {
      setAdminMsg('Failed to update config.');
    } finally {
      setSavingConfig(false);
    }
  };

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
            <LabelTape text="ROOM 7 // PLANNING & LOGS" color="var(--watch)" />
            <span className="font-mono text-xs text-graphite-3 uppercase tracking-wider">
              30-DAY WORK ORDERS, 3-POSITION ALARM REVIEWS & ADMIN AUDIT
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-graphite uppercase mt-1">
            Office, Plan & Alarm Review
          </h1>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-sheet border border-line p-1 rounded font-mono text-xs shadow-2xs">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'plan' ? 'bg-hivis text-graphite font-bold shadow-xs' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Maintenance Schedule
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'review' ? 'bg-hivis text-graphite font-bold shadow-xs' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Alarm Review ({openAlerts.length})
          </button>
          {user?.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                activeTab === 'admin' ? 'bg-hivis text-graphite font-bold shadow-xs' : 'text-graphite-2 hover:bg-plate'
              }`}
            >
              Admin & Audit Trail
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MAINTENANCE SCHEDULE */}
      {activeTab === 'plan' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Plate
            title="30-DAY PRIORITIZED MAINTENANCE SCHEDULE"
            badge={`${planItems.length} RANKED ACTIONS`}
            badgeColor="var(--steel)"
          >
            <div className="overflow-x-auto pt-1 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-graphite-3 text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Failure Risk</th>
                    <th className="py-2.5 px-3">Downtime Cost</th>
                    <th className="py-2.5 px-3">Work Window</th>
                    <th className="py-2.5 px-3">Action & Rationale</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {planItems.map(item => (
                    <tr key={item.id} className="hover:bg-plate/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-display font-extrabold text-lg text-hivis leading-none">
                          {Math.round(item.priority_score || 85)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-graphite">{item.machine_name}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-fault">
                          {Math.round((item.risk_prob || 0.75) * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-graphite-2">
                        ${item.downtime_cost?.toLocaleString()}/hr
                      </td>
                      <td className="py-3 px-3 text-graphite-3 text-[11px]">
                        {item.window_start ? new Date(item.window_start).toLocaleDateString() : 'Next Shutdown'}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-graphite">{item.suggested_action}</div>
                        <div className="text-[10px] text-graphite-3 truncate mt-0.5">{item.rationale}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'approved'
                            ? 'bg-steel/10 text-steel'
                            : 'bg-watch/10 text-watch'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.status !== 'approved' ? (
                          <button
                            onClick={() => handleApprovePlanItem(item.id)}
                            className="px-3 py-1 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded uppercase tracking-wider text-[11px] cursor-pointer shadow-xs"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-steel font-bold text-[11px]">✓ Scheduled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Plate>
        </motion.div>
      )}

      {/* TAB 2: ALARM REVIEW & TECHNICIAN FEEDBACK */}
      {activeTab === 'review' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left: Alarms Awaiting Review */}
          <div className="lg:col-span-1">
            <Plate title="ALARMS AWAITING REVIEW" badge={`${openAlerts.length} OPEN`}>
              <div className="divide-y divide-line pt-1 font-mono text-xs max-h-[500px] overflow-y-auto">
                {openAlerts.map(alert => {
                  const isSelected = selectedAlert?.id === alert.id;
                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-plate border-l-4 border-hivis' : 'hover:bg-plate/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-graphite">{alert.machine_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-fault/10 text-fault">
                          {alert.severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-graphite-3 mt-1">
                        <span>Risk: {Math.round(alert.risk_score * 100)}%</span>
                        <span>{new Date(alert.opened_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
                {openAlerts.length === 0 && (
                  <div className="py-8 text-center text-graphite-3">
                    No active unreviewed alarms. All clear.
                  </div>
                )}
              </div>
            </Plate>
          </div>

          {/* Right: 3-Position Review Inspection Form */}
          <div className="lg:col-span-2">
            <Plate
              title={`INSPECTION FEEDBACK // ${selectedAlert?.machine_name || 'SELECT ALARM'}`}
              badge="FEEDBACK LOOP"
            >
              {reviewSuccess && (
                <div className="mb-4 p-3 bg-steel/10 border border-steel/40 text-graphite font-mono text-xs rounded font-bold">
                  ✓ {reviewSuccess}
                </div>
              )}

              {selectedAlert ? (
                <form onSubmit={handleSubmitReview} className="space-y-5 pt-1 font-mono text-xs">
                  {/* Alert summary chip */}
                  <div className="bg-plate p-3.5 rounded-lg border border-line flex items-center justify-between">
                    <div>
                      <div className="font-bold text-graphite text-base">{selectedAlert.machine_name}</div>
                      <div className="text-[11px] text-graphite-3 mt-0.5">
                        Opened: {new Date(selectedAlert.opened_at).toLocaleString()} • Severity: {selectedAlert.severity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-graphite-3 uppercase font-bold">Failure Probability</div>
                      <div className="font-display font-black text-fault text-2xl">
                        {Math.round(selectedAlert.risk_score * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* 3-Position Alarm Review Selector Component */}
                  <div>
                    <label className="block text-[11px] text-graphite-3 uppercase font-bold mb-2">
                      Technician Verdict (Use Keys 1, 2, or 3)
                    </label>
                    <ThreeWaySelector
                      value={reviewOutcome}
                      onChange={setReviewOutcome}
                    />
                  </div>

                  {/* Root cause dropdown */}
                  <div>
                    <label className="block text-[11px] text-graphite-3 uppercase font-bold mb-1">
                      Root Cause Category
                    </label>
                    <select
                      value={rootCause}
                      onChange={e => setRootCause(e.target.value)}
                      className="w-full bg-plate border border-line p-2.5 rounded text-graphite focus:border-hivis outline-none font-bold cursor-pointer"
                    >
                      <option value="Impeller wear / bearing race microspall">Impeller wear / bearing race microspall</option>
                      <option value="Mechanical looseness / misalignment">Mechanical looseness / misalignment</option>
                      <option value="Lubrication starvation / oil contamination">Lubrication starvation / oil contamination</option>
                      <option value="Sensor calibration drift / loose wiring">Sensor calibration drift / loose wiring</option>
                      <option value="Process operational spike / transient load">Process operational spike / transient load</option>
                      <option value="Other / Unverified">Other / Unverified</option>
                    </select>
                  </div>

                  {/* Technician Notes */}
                  <div>
                    <label className="block text-[11px] text-graphite-3 uppercase font-bold mb-1">
                      Inspection Findings & Rectification Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Inspected drive end bearing with thermal camera. Surface temp confirmed at 78C with acoustic signature. Scheduled for grease repack."
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      className="w-full bg-plate border border-line p-2.5 rounded text-graphite focus:border-hivis outline-none"
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-6 py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                    >
                      {submittingReview ? 'Submitting Feedback...' : 'Submit Feedback & Close Alarm'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-12 text-center text-graphite-3 font-mono text-xs">
                  Select an active alarm on the left to begin feedback review.
                </div>
              )}
            </Plate>
          </div>
        </motion.div>
      )}

      {/* TAB 3: ADMIN & AUDIT TRAIL */}
      {activeTab === 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {adminMsg && (
            <div className="p-3 bg-steel/10 border border-steel/40 text-graphite font-mono text-xs rounded font-bold">
              ✓ {adminMsg}
            </div>
          )}

          <Plate title="SYSTEM CONFIGURATION // THRESHOLDS & DOWNTIME ECONOMICS">
            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 font-mono text-xs items-end">
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase font-bold mb-1">
                  Cost of Missed Failure ($)
                </label>
                <input
                  type="number"
                  value={config.default_cost_miss}
                  onChange={e => setConfig({ ...config, default_cost_miss: parseFloat(e.target.value) })}
                  className="w-full bg-plate border border-line p-2 rounded text-graphite focus:border-hivis outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-graphite-3 uppercase font-bold mb-1">
                  Cost of False Alarm Inspection ($)
                </label>
                <input
                  type="number"
                  value={config.default_cost_false}
                  onChange={e => setConfig({ ...config, default_cost_false: parseFloat(e.target.value) })}
                  className="w-full bg-plate border border-line p-2 rounded text-graphite focus:border-hivis outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-graphite-3 uppercase font-bold mb-1">
                  Default Horizon Window (Hours)
                </label>
                <input
                  type="number"
                  value={config.default_horizon_hours}
                  onChange={e => setConfig({ ...config, default_horizon_hours: parseInt(e.target.value) })}
                  className="w-full bg-plate border border-line p-2 rounded text-graphite focus:border-hivis outline-none font-bold"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                >
                  {savingConfig ? 'Saving...' : 'Update Parameters'}
                </button>
              </div>
            </form>
          </Plate>

          <Plate title="AUDIT TRAIL // SYSTEM COMPLIANCE LOGS">
            <div className="overflow-x-auto pt-1 font-mono text-xs max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-graphite-3 text-[10px] uppercase font-bold">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {auditLogs.map((log: any, idx: number) => (
                    <tr key={idx} className="hover:bg-plate/40">
                      <td className="py-2 px-3 text-graphite-3">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-2 px-3 font-bold text-graphite">{log.user || 'admin@predictmaint.ai'}</td>
                      <td className="py-2 px-3 text-graphite-2">{log.action || 'MODEL_ACTIVATE'}</td>
                      <td className="py-2 px-3 text-graphite-3">{log.target || 'Model PM-XGB-01'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-graphite-3">
                        Audit records logged securely in MongoDB.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Plate>
        </motion.div>
      )}
    </motion.div>
  );
};
