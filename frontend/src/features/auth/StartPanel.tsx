import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';

export const StartPanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const defaultEmail = searchParams.get('email') || 'engineer@predictmaint.ai';
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('PredictMaint2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.access_token, data.user);
      navigate('/floor');
    } catch (err: any) {
      setError(err.message || 'Authentication rejected. Verify Operator ID and Passcode.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setError(null);
  };

  const fillCredential = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('PredictMaint2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-plate flex items-center justify-center p-6">
      {/* Industrial Start Panel Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md bg-sheet border border-line rounded-lg shadow-lg overflow-hidden"
      >
        {/* Panel Header Strip */}
        <div className="bg-graphite text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-hivis animate-pulse" />
            <span className="font-mono text-xs uppercase font-bold tracking-widest text-white">
              CONTROL PANEL // ACCESS TERMINAL
            </span>
          </div>
          <span className="font-mono text-[10px] text-graphite-3 uppercase">SECURE 256-BIT</span>
        </div>

        {/* Engraved Slot Panel */}
        <form onSubmit={handleStart} className="p-6 space-y-5">
          {error && (
            <div className="bg-fault/10 border border-fault text-fault p-3 rounded font-mono text-xs flex items-center gap-2">
              <span className="font-bold">✖ ERROR:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Operator ID Engraved Slot */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase font-bold text-graphite-2 tracking-wider">
              OPERATOR ID [EMAIL]
            </label>
            <div className="bg-plate border border-line rounded px-3 py-2 focus-within:border-hivis transition-colors">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="engineer@predictmaint.ai"
                className="w-full bg-transparent font-mono text-sm text-graphite outline-none placeholder:text-graphite-3"
              />
            </div>
          </div>

          {/* Passcode Slot */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono uppercase font-bold text-graphite-2 tracking-wider">
                OPERATIONAL PASSCODE
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] font-mono text-graphite-3 hover:text-graphite uppercase"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <div className="bg-plate border border-line rounded px-3 py-2 focus-within:border-hivis transition-colors">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent font-mono text-sm text-graphite outline-none"
              />
            </div>
          </div>

          {/* Big Round START Button (Specification requirement: Hi-Vis fill with Graphite text!) */}
          <div className="pt-2 flex items-center justify-between gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-hivis hover:bg-hivis-deep active:translate-y-0.5 text-graphite font-display font-black text-2xl uppercase tracking-wider py-3.5 rounded shadow-md border-b-4 border-hivis-deep transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-graphite border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>START</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="bg-plate hover:bg-sheet border border-line px-4 py-3.5 rounded font-mono text-xs uppercase font-bold text-graphite-2 hover:text-graphite transition-all"
            >
              RESET
            </button>
          </div>

          {/* Quick Identity Selectors */}
          <div className="pt-4 border-t border-line">
            <div className="text-[10px] font-mono uppercase text-graphite-3 font-bold mb-2">
              ONE-CLICK DEMO IDENTITY SELECTOR
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredential('engineer@predictmaint.ai')}
                className="bg-plate hover:bg-hivis-wash border border-line p-2 rounded text-left transition-colors"
              >
                <div className="font-bold text-xs text-graphite">Reliability Engineer</div>
                <div className="font-mono text-[9px] text-graphite-3">Full model & plan control</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredential('admin@predictmaint.ai')}
                className="bg-plate hover:bg-hivis-wash border border-line p-2 rounded text-left transition-colors"
              >
                <div className="font-bold text-xs text-graphite">Plant Engineer (Admin)</div>
                <div className="font-mono text-[9px] text-graphite-3">Users, audits & thresholds</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredential('tech@predictmaint.ai')}
                className="bg-plate hover:bg-hivis-wash border border-line p-2 rounded text-left transition-colors"
              >
                <div className="font-bold text-xs text-graphite">Line Technician</div>
                <div className="font-mono text-[9px] text-graphite-3">Readings entry & review</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredential('viewer@predictmaint.ai')}
                className="bg-plate hover:bg-hivis-wash border border-line p-2 rounded text-left transition-colors"
              >
                <div className="font-bold text-xs text-graphite">Operations (Viewer)</div>
                <div className="font-mono text-[9px] text-graphite-3">Read-only intelligence</div>
              </button>
            </div>
          </div>
        </form>

        {/* Panel Footer */}
        <div className="bg-plate border-t border-line px-5 py-2.5 text-[10px] font-mono text-graphite-3 text-center">
          Industrial decision support system · Formula pm-v1
        </div>
      </motion.div>
    </div>
  );
};
