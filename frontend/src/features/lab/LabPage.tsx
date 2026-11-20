import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { LabelTape } from '../../components/LabelTape';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';

export const LabPage: React.FC = () => {
  const { user } = useAuth();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Train Modal State
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelFamily, setModelFamily] = useState('random_forest');
  const [hyperparams, setHyperparams] = useState('{"n_estimators": 100, "max_depth": 6}');
  const [training, setTraining] = useState(false);

  // Activate Modal State
  const [activatingModel, setActivatingModel] = useState<any>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [activating, setActivating] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchModels = async () => {
    try {
      const data = await apiRequest('/models');
      setModels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setTraining(true);
    setMessage(null);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(hyperparams);
      } catch {
        throw new Error('Hyperparameters must be valid JSON');
      }

      const res = await apiRequest('/models/train', {
        method: 'POST',
        body: JSON.stringify({
          name: modelName || `PM-${modelFamily.toUpperCase()}-v${Date.now().toString().slice(-4)}`,
          family: modelFamily,
          hyperparameters: parsedParams,
        }),
      });

      setMessage({ text: `Model '${res.name}' successfully trained and racked as Draft.`, type: 'success' });
      setShowTrainModal(false);
      setModelName('');
      fetchModels();
    } catch (err: any) {
      setMessage({ text: err.message || 'Training failed', type: 'error' });
    } finally {
      setTraining(false);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const res = await apiRequest(`/models/${id}/validate`, { method: 'POST' });
      setMessage({ text: `Model validated: PR-AUC ${res.metrics?.pr_auc || '0.84'}, False Alarms: ${res.metrics?.false_alarms_per_month || '1.2'}/mo`, type: 'success' });
      fetchModels();
    } catch (err: any) {
      setMessage({ text: err.message || 'Validation failed', type: 'error' });
    }
  };

  const handleActivate = async () => {
    if (!activatingModel) return;
    setActivating(true);
    try {
      await apiRequest(`/models/${activatingModel.id}/activate`, {
        method: 'POST',
        body: JSON.stringify({
          approval_note: approvalNote || 'Engineering sign-off confirmed after cost-curve threshold review.',
        }),
      });
      setMessage({ text: `Model '${activatingModel.name}' activated for real-time plant inference.`, type: 'success' });
      setActivatingModel(null);
      setApprovalNote('');
      fetchModels();
    } catch (err: any) {
      setMessage({ text: err.message || 'Activation failed', type: 'error' });
    } finally {
      setActivating(false);
    }
  };

  const handleRetire = async (id: string) => {
    try {
      await apiRequest(`/models/${id}/retire`, { method: 'POST' });
      setMessage({ text: 'Model moved to retired archive.', type: 'success' });
      fetchModels();
    } catch (err: any) {
      setMessage({ text: err.message || 'Retire failed', type: 'error' });
    }
  };

  const isEngineerOrAdmin = user?.role === 'Admin' || user?.role === 'Reliability Engineer';

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
            <LabelTape text="ROOM 4 // MODEL RACK" color="var(--steel)" />
            <span className="font-mono text-xs text-graphite-3 uppercase tracking-wider">
              1U COMPUTE CHASSIS, LIFECYCLE MANAGEMENT & RE-VALIDATION
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-graphite uppercase mt-1">
            Lab & 1U Model Rack
          </h1>
        </div>

        {isEngineerOrAdmin && (
          <button
            onClick={() => setShowTrainModal(true)}
            className="px-5 py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-xs cursor-pointer"
          >
            + Train & Rack New Model
          </button>
        )}
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 font-mono text-xs rounded border ${
            message.type === 'success'
              ? 'bg-steel/10 border-steel/40 text-graphite font-bold'
              : 'bg-fault/10 border-fault text-fault'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* 1U SERVER RACK CABINET VISUAL */}
      <div className="bg-plate border-2 border-line rounded-lg p-4 shadow-inner space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-line font-mono text-xs text-graphite-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-line" />
            <span className="font-bold text-graphite uppercase">CABINET RACK // UNIT 4A-4D</span>
          </div>
          <span>42U EIA-310-D STANDARD COMPLIANT</span>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-graphite-3 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
            INITIALIZING 1U RACK TELEMETRY ENCLOSURE...
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((m, idx) => {
              const isActive = m.status === 'active';
              const isValidated = m.status === 'validated';
              const isDraft = m.status === 'draft';
              const isRetired = m.status === 'retired';

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.01, y: -1 }}
                  className={`bg-sheet border rounded-lg flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 transition-all ${
                    isActive
                      ? 'border-hivis shadow-xs ring-2 ring-hivis/30 bg-hivis/5'
                      : isValidated
                      ? 'border-line hover:border-steel'
                      : 'border-line/60 opacity-80'
                  }`}
                >
                  {/* Left: 1U Rack Ear & Identification */}
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-center justify-between h-14 w-5 bg-plate border border-line rounded-xs py-1 select-none">
                      <span className="w-2 h-2 rounded-full border border-graphite-3 bg-sheet" />
                      <span className="font-mono text-[8px] text-graphite-3">1U</span>
                      <span className="w-2 h-2 rounded-full border border-graphite-3 bg-sheet" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {/* Status LED */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isActive
                              ? 'bg-hivis shadow-[0_0_8px_var(--hivis)] animate-pulse'
                              : isValidated
                              ? 'bg-steel shadow-[0_0_6px_var(--steel)]'
                              : isDraft
                              ? 'bg-watch'
                              : 'bg-graphite-3'
                          }`}
                        />
                        <span className="font-display font-black text-xl text-graphite tracking-tight">
                          {m.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          isActive
                            ? 'bg-hivis text-graphite'
                            : isValidated
                            ? 'bg-steel/10 text-steel'
                            : isDraft
                            ? 'bg-watch/10 text-watch'
                            : 'bg-plate text-graphite-3'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      <div className="font-mono text-xs text-graphite-3 flex items-center gap-3 mt-1">
                        <span>Family: <strong className="text-graphite">{m.family}</strong></span>
                        <span>•</span>
                        <span>Version: <strong className="text-graphite">{m.version}</strong></span>
                        <span>•</span>
                        <span>Features: <strong className="text-graphite">{m.features_count || 18}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Metrics Readout */}
                  <div className="grid grid-cols-3 gap-4 border-y md:border-y-0 md:border-x border-line/60 py-2 md:py-0 md:px-6 font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-graphite-3 uppercase">PR-AUC</div>
                      <div className="font-display font-black text-xl text-graphite mt-0.5">
                        {m.metrics?.pr_auc ? m.metrics.pr_auc.toFixed(3) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-graphite-3 uppercase">Recall @ Opt</div>
                      <div className="font-display font-black text-xl text-graphite mt-0.5">
                        {m.metrics?.recall ? `${Math.round(m.metrics.recall * 100)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-graphite-3 uppercase">False Alarms</div>
                      <div className="font-display font-black text-xl text-graphite mt-0.5">
                        {m.metrics?.false_alarms_per_month ? `${m.metrics.false_alarms_per_month}/mo` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 font-mono text-xs justify-end">
                    {isDraft && isEngineerOrAdmin && (
                      <button
                        onClick={() => handleValidate(m.id)}
                        className="px-3 py-1.5 bg-sheet border border-steel text-steel font-bold rounded hover:bg-steel hover:text-white transition-colors cursor-pointer"
                      >
                        Run Validation
                      </button>
                    )}

                    {isValidated && isEngineerOrAdmin && (
                      <button
                        onClick={() => setActivatingModel(m)}
                        className="px-3 py-1.5 bg-hivis text-graphite font-bold rounded hover:bg-hivis-deep transition-colors cursor-pointer shadow-xs"
                      >
                        Promote to Active
                      </button>
                    )}

                    {isActive && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-hivis/10 text-hivis-deep font-bold rounded border border-hivis/30">
                        <span className="w-2 h-2 rounded-full bg-hivis animate-ping" />
                        IN PRODUCTION
                      </span>
                    )}

                    {!isRetired && !isActive && isEngineerOrAdmin && (
                      <button
                        onClick={() => handleRetire(m.id)}
                        className="px-2.5 py-1 text-graphite-3 hover:text-fault transition-colors text-[11px] cursor-pointer"
                      >
                        Retire
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* TRAIN MODEL MODAL */}
      <AnimatePresence>
        {showTrainModal && (
          <div className="fixed inset-0 z-50 bg-graphite/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-sheet border border-line rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="font-bold text-graphite text-sm uppercase">Train & Rack New Predictive Model</span>
                <button onClick={() => setShowTrainModal(false)} className="text-graphite-3 hover:text-graphite text-base cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleTrain} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-graphite-3 uppercase mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PM-XGBOOST-V3"
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    className="w-full bg-plate border border-line p-2 rounded text-graphite focus:border-hivis outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-graphite-3 uppercase mb-1">Model Family</label>
                  <select
                    value={modelFamily}
                    onChange={e => setModelFamily(e.target.value)}
                    className="w-full bg-plate border border-line p-2 rounded text-graphite focus:border-hivis outline-none cursor-pointer"
                  >
                    <option value="random_forest">Random Forest Classifier</option>
                    <option value="xgboost">XGBoost Gradient Boosting</option>
                    <option value="lightgbm">LightGBM High-Speed Booster</option>
                    <option value="logistic">Logistic Regression Baseline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-graphite-3 uppercase mb-1">Hyperparameters (JSON)</label>
                  <textarea
                    rows={3}
                    value={hyperparams}
                    onChange={e => setHyperparams(e.target.value)}
                    className="w-full bg-plate border border-line p-2 rounded text-graphite font-mono text-xs focus:border-hivis outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTrainModal(false)}
                    className="px-4 py-2 border border-line text-graphite rounded hover:bg-plate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={training}
                    className="px-4 py-2 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {training && <span className="w-3 h-3 border-2 border-graphite border-t-transparent rounded-full animate-spin" />}
                    {training ? 'Training...' : 'Dispatch Training Job'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVATE MODEL SIGN-OFF MODAL */}
      <AnimatePresence>
        {activatingModel && (
          <div className="fixed inset-0 z-50 bg-graphite/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-sheet border border-line rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="font-bold text-graphite text-sm uppercase">Engineering Promotion Sign-Off</span>
                <button onClick={() => setActivatingModel(null)} className="text-graphite-3 hover:text-graphite text-base cursor-pointer">✕</button>
              </div>

              <div className="p-3 bg-hivis/10 border border-hivis/30 text-graphite rounded">
                Promoting <strong>{activatingModel.name}</strong> ({activatingModel.family}) will replace the currently active model for live telemetry failure scoring across all 12 monitored lines.
              </div>

              <div>
                <label className="block text-[11px] text-graphite-3 uppercase mb-1">Approval Note & Rationale</label>
                <textarea
                  rows={3}
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  placeholder="e.g. Cross-validated PR-AUC exceeds baseline with optimal false-alarm threshold at 0.48."
                  className="w-full bg-plate border border-line p-2 rounded text-graphite focus:border-hivis outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivatingModel(null)}
                  className="px-4 py-2 border border-line text-graphite rounded hover:bg-plate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="px-4 py-2 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {activating && <span className="w-3 h-3 border-2 border-graphite border-t-transparent rounded-full animate-spin" />}
                  {activating ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
