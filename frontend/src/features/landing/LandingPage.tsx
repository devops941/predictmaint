import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth';

export const LandingPage: React.FC = () => {
  const [warningDays, setWarningDays] = useState(6);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Demo direct login launcher
  const quickLoginAs = (role: string, email: string) => {
    // Navigate to login with query param or directly log in with seed user
    navigate(`/login?email=${encodeURIComponent(email)}`);
  };

  // P-F curve points calculation
  const curvePoints = [];
  for (let d = 14; d >= 0; d--) {
    const x = ((14 - d) / 14) * 500 + 40;
    // Degradation curve: starts flat, degrades exponentially towards failure
    const degradation = Math.pow((14 - d) / 14, 2.8);
    const y = 50 + degradation * 160;
    curvePoints.push({ d, x, y });
  }

  const selectedPoint = curvePoints.find(p => p.d === warningDays) || curvePoints[8];

  return (
    <div className="min-h-screen bg-plate text-graphite flex flex-col">
      {/* Top Bar */}
      <header className="h-20 bg-sheet border-b border-line px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-hivis rounded flex items-center justify-center font-display font-black text-xl text-graphite">
            PM
          </div>
          <div>
            <span className="font-display font-black text-2xl tracking-wider text-graphite uppercase">
              PREDICTMAINT<span className="text-hivis">.AI</span>
            </span>
            <span className="block font-mono text-[9px] text-graphite-3 uppercase tracking-widest">
              SENSOR-DRIVEN EQUIPMENT INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="bg-hivis text-graphite font-mono font-bold text-xs uppercase px-5 py-2.5 rounded shadow-xs hover:bg-hivis-deep transition-all tracking-wider"
          >
            START OPERATOR CONSOLE
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-12"
      >
        {/* Hero Section: Interactive P-F Curve */}
        <div className="bg-sheet border border-line rounded p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-line">
            <div>
              <div className="inline-block bg-graphite text-white font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm mb-2">
                P–F INTERVAL DIAGNOSTIC MODEL // FORMULA PM-V1
              </div>
              <h1 className="font-display font-extrabold text-4xl text-graphite tracking-tight uppercase">
                DETECT DEGRADATION DAYS BEFORE FUNCTIONAL FAILURE
              </h1>
              <p className="text-sm text-graphite-2 font-mono mt-1">
                Machine failure does not happen instantaneously. Degradation patterns manifest in vibration harmonics and thermal gradients days in advance.
              </p>
            </div>

            {/* Slider control */}
            <div className="bg-plate border border-line p-3 rounded text-right min-w-[220px]">
              <div className="text-[10px] font-mono uppercase text-graphite-3 font-bold">
                Detection Lead Time Warning
              </div>
              <div className="text-2xl font-mono font-bold text-hivis-deep mt-0.5">
                {warningDays} DAYS PRIOR
              </div>
              <input
                type="range"
                min="1"
                max="14"
                value={warningDays}
                onChange={e => setWarningDays(Number(e.target.value))}
                className="w-full mt-2 accent-hivis cursor-pointer"
              />
            </div>
          </div>

          {/* Interactive SVG P-F Curve */}
          <div className="relative w-full h-64 bg-plate border border-line rounded p-4 overflow-hidden">
            <svg viewBox="0 0 580 250" className="w-full h-full">
              {/* Axes and grid */}
              <line x1="40" y1="210" x2="560" y2="210" stroke="var(--line)" strokeWidth="1.5" />
              <line x1="40" y1="30" x2="40" y2="210" stroke="var(--line)" strokeWidth="1.5" />

              {/* Labels */}
              <text x="45" y="45" fontSize="9" fontFamily="Share Tech Mono" fill="var(--graphite-3)">
                EQUIPMENT CONDITION (100% HEALTHY)
              </text>
              <text x="440" y="235" fontSize="9" fontFamily="Share Tech Mono" fill="var(--fault)">
                FUNCTIONAL FAILURE (0%)
              </text>

              {/* Threshold line */}
              <line x1="40" y1="170" x2="560" y2="170" stroke="var(--graphite-3)" strokeDasharray="4 4" strokeWidth="1" />
              <text x="45" y="165" fontSize="8" fontFamily="Share Tech Mono" fill="var(--graphite-3)">
                TYPICAL ALARM THRESHOLD (TOO LATE TO PLAN)
              </text>

              {/* The P-F Curve Line */}
              <path
                d={curvePoints.reduce(
                  (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                  ''
                )}
                fill="none"
                stroke="var(--graphite)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Current warning day interactive marker */}
              <g transform={`translate(${selectedPoint.x}, ${selectedPoint.y})`}>
                <circle r="7" fill="var(--hivis)" stroke="var(--graphite)" strokeWidth="2" />
                <circle r="12" fill="none" stroke="var(--hivis)" strokeWidth="1" className="animate-ping" />
                <line x1="0" y1="0" x2="0" y2={210 - selectedPoint.y} stroke="var(--hivis)" strokeDasharray="2 2" strokeWidth="1.5" />
              </g>

              {/* Fixed PredictMaint callout box */}
              <rect x="230" y="55" width="230" height="36" fill="var(--sheet)" stroke="var(--hivis)" rx="3" strokeWidth="1.5" />
              <text x="240" y="70" fontSize="9" fontFamily="Share Tech Mono" fontWeight="700" fill="var(--graphite)">
                DETECTED BY PREDICTMAINT AI
              </text>
              <text x="240" y="83" fontSize="8" fontFamily="Barlow" fill="var(--graphite-2)">
                Bearing inner race spall warned ~6 days before catastrophe
              </text>
            </svg>
          </div>
        </div>

        {/* 3 Plain-Language Pillars: Detect · Predict · Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-sheet border border-line rounded p-6 shadow-xs relative">
            <div className="inline-block bg-graphite text-white font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm mb-3">
              01 // DETECT
            </div>
            <h3 className="font-display font-extrabold text-2xl text-graphite uppercase">
              VIBRATION & SENSOR INTELLIGENCE
            </h3>
            <p className="text-sm text-graphite-2 font-mono mt-2 leading-relaxed">
              Ingests raw multi-sensor streams (vibration RMS, bearing temperature, motor current, pressure, speed). Extracts Crest Factor, Kurtosis, and FFT frequency bands without leakage.
            </p>
          </div>

          <div className="bg-sheet border border-line rounded p-6 shadow-xs relative">
            <div className="inline-block bg-graphite text-white font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm mb-3">
              02 // PREDICT
            </div>
            <h3 className="font-display font-extrabold text-2xl text-graphite uppercase">
              72-HOUR FAILURE HORIZON
            </h3>
            <p className="text-sm text-graphite-2 font-mono mt-2 leading-relaxed">
              Calibrated supervised classifiers (HistGradientBoosting, Random Forest) evaluate probability of failure within the next H hours, calibrated to minimize downtime vs inspection costs.
            </p>
          </div>

          <div className="bg-sheet border border-line rounded p-6 shadow-xs relative">
            <div className="inline-block bg-graphite text-white font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm mb-3">
              03 // PLAN
            </div>
            <h3 className="font-display font-extrabold text-2xl text-graphite uppercase">
              RANKED ACTION SCHEDULE
            </h3>
            <p className="text-sm text-graphite-2 font-mono mt-2 leading-relaxed">
              Turns risk probabilities into a dollar-prioritized maintenance schedule aligned with plant shutdown windows. Technician feedback loop flags false alarms and feeds next training cycle.
            </p>
          </div>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="bg-sheet border border-line rounded p-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="font-mono text-xs uppercase font-bold text-graphite tracking-wider">
                EXPLORE WITH INDUSTRIAL ROLE IDENTITIES
              </span>
              <p className="text-xs text-graphite-3 font-mono mt-0.5">
                Passcode for all demo identities: <span className="text-graphite font-bold font-mono">PredictMaint2026!</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => quickLoginAs('Admin', 'admin@predictmaint.ai')}
                className="bg-plate hover:bg-sheet border border-line hover:border-hivis px-3 py-1.5 rounded text-xs font-mono font-bold text-graphite"
              >
                Chief Plant Engineer (Admin)
              </button>
              <button
                onClick={() => quickLoginAs('Reliability Engineer', 'engineer@predictmaint.ai')}
                className="bg-plate hover:bg-sheet border border-line hover:border-hivis px-3 py-1.5 rounded text-xs font-mono font-bold text-graphite"
              >
                Reliability Engineer
              </button>
              <button
                onClick={() => quickLoginAs('Technician', 'tech@predictmaint.ai')}
                className="bg-plate hover:bg-sheet border border-line hover:border-hivis px-3 py-1.5 rounded text-xs font-mono font-bold text-graphite"
              >
                Line Technician
              </button>
              <button
                onClick={() => quickLoginAs('Viewer', 'viewer@predictmaint.ai')}
                className="bg-plate hover:bg-sheet border border-line hover:border-hivis px-3 py-1.5 rounded text-xs font-mono font-bold text-graphite"
              >
                Operations Director (Viewer)
              </button>
            </div>
          </div>
        </div>
      </motion.main>

      {/* Advisory Footer */}
      <footer className="h-14 bg-sheet border-t border-line px-8 flex items-center justify-between text-xs font-mono text-graphite-3">
        <span>Advisory decision support. Inspect equipment before you act.</span>
        <span>FORMULA VERSION PM-V1 · ALL SEED DATA SYNTHETIC</span>
      </footer>
    </div>
  );
};
