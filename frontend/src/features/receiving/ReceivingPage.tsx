import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { LabelTape } from '../../components/LabelTape';
import { apiRequest, BASE_URL } from '../../lib/api';

export const ReceivingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'quick' | 'registry'>('upload');
  
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<'readings' | 'maintenance'>('readings');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedFixes, setSelectedFixes] = useState<string[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Reading State
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [vibration, setVibration] = useState('2.45');
  const [temp, setTemp] = useState('58.2');
  const [current, setCurrent] = useState('64.1');
  const [pressure, setPressure] = useState('6.8');
  const [speed, setSpeed] = useState('1480.0');
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);

  useEffect(() => {
    apiRequest('/machines').then(m => {
      setMachines(m);
      if (m.length > 0) setSelectedMachine(m[0].id);
    }).catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setScanResult(null);
      setCommitSuccess(null);
      setErrorMsg(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', uploadKind);

      const res = await apiRequest('/uploads/scan', {
        method: 'POST',
        body: formData,
      });
      setScanResult(res);
      // Pre-select all proposed fixes
      if (res.proposals) {
        setSelectedFixes(res.proposals.map((p: any) => p.issue_id));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan error');
    } finally {
      setScanning(false);
    }
  };

  const handleApplyFixesAndRelease = async () => {
    if (!scanResult) return;
    setCommitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        batch_id: scanResult.batch_id,
        selected_fixes: selectedFixes,
        target_table: uploadKind === 'readings' ? 'sensor_readings' : 'maintenance_logs',
      };
      const res = await apiRequest('/uploads/commit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCommitSuccess(res.message || 'Data successfully cleaned and released to database.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Commit error');
    } finally {
      setCommitting(false);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setQuickSubmitting(true);
    try {
      await apiRequest('/readings/quick', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: selectedMachine,
          timestamp: new Date().toISOString(),
          readings: {
            vibration_rms_mm_s: parseFloat(vibration),
            bearing_temp_c: parseFloat(temp),
            motor_current_a: parseFloat(current),
            pressure_bar: parseFloat(pressure),
            speed_rpm: parseFloat(speed),
          },
        }),
      });
      setQuickSuccess(true);
      setTimeout(() => setQuickSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit reading');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const downloadFile = (endpoint: string, filename: string) => {
    const token = localStorage.getItem('pm_access_token');
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      })
      .catch(console.error);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Title Tape */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <LabelTape text="ROOM 1 // INTAKE DOCK" color="var(--steel)" />
            <span className="font-mono text-xs text-graphite-3 uppercase tracking-wider">
              DATA INGESTION, SCAN & FIX WIZARD, REGISTRY
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-graphite uppercase mt-1">
            Receiving & Data Ingestion
          </h1>
        </div>

        {/* Room Tab Selector */}
        <div className="flex bg-sheet border border-line p-1 rounded font-mono text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'upload' ? 'bg-hivis text-graphite font-bold' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Upload Dock & Fix
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'quick' ? 'bg-hivis text-graphite font-bold' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Quick Entry Grid
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'registry' ? 'bg-hivis text-graphite font-bold' : 'text-graphite-2 hover:bg-plate'
            }`}
          >
            Machine Registry
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-fault/10 border border-fault text-fault font-mono text-xs rounded">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: UPLOAD DOCK & SCAN-FIX WIZARD */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Roller Shutter Upload Box */}
            <div className="lg:col-span-1">
              <Plate title="ROLLER-SHUTTER INTAKE DOCK">
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block font-mono text-[11px] text-graphite-3 uppercase mb-1">
                      Data Stream Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setUploadKind('readings')}
                        className={`p-2 rounded border text-center font-bold ${
                          uploadKind === 'readings'
                            ? 'bg-hivis/10 border-hivis text-graphite'
                            : 'bg-plate border-line text-graphite-3'
                        }`}
                      >
                        Sensor Readings
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadKind('maintenance')}
                        className={`p-2 rounded border text-center font-bold ${
                          uploadKind === 'maintenance'
                            ? 'bg-hivis/10 border-hivis text-graphite'
                            : 'bg-plate border-line text-graphite-3'
                        }`}
                      >
                        Maintenance Log
                      </button>
                    </div>
                  </div>

                  {/* Drop area styled like industrial shutter doors */}
                  <div className="border-2 border-dashed border-line bg-plate/40 hover:bg-plate/80 rounded-lg p-6 text-center transition-colors relative">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="font-mono text-xs text-graphite-2">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-sheet border border-line flex items-center justify-center font-mono font-bold text-hivis">
                        ↓
                      </div>
                      <span className="font-bold text-graphite">
                        {file ? file.name : 'DROP CSV / EXCEL TELEMETRY'}
                      </span>
                      <div className="text-[10px] text-graphite-3 mt-1">
                        Supports up to 25 MB • Auto header parsing
                      </div>
                    </div>
                  </div>

                  {file && (
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="w-full py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2"
                    >
                      {scanning && <span className="w-3.5 h-3.5 border-2 border-graphite border-t-transparent rounded-full animate-spin" />}
                      {scanning ? 'Scanning Dataset...' : 'Trigger Quality Scan'}
                    </button>
                  )}

                  {/* Template & Sample Downloads */}
                  <div className="pt-2 border-t border-line space-y-2">
                    <div className="text-[10px] font-mono text-graphite-3 uppercase">Templates & Fixtures:</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadFile('/uploads/template?kind=readings', 'readings_template.csv')}
                        className="flex-1 py-1 px-2 bg-plate border border-line rounded text-[11px] font-mono text-graphite hover:border-graphite text-center"
                      >
                        CSV Template
                      </button>
                      <button
                        onClick={() => downloadFile('/uploads/sample', 'synthetic_sensor_sample.csv')}
                        className="flex-1 py-1 px-2 bg-plate border border-line rounded text-[11px] font-mono text-graphite hover:border-graphite text-center"
                      >
                        Sample Dataset
                      </button>
                    </div>
                  </div>
                </div>
              </Plate>
            </div>

            {/* Right: Scan Results & Fix Proposals */}
            <div className="lg:col-span-2">
              <Plate
                title="SCAN & FIX WIZARD // DIAGNOSTIC AUDIT"
                badge={scanResult ? `${scanResult.issues?.length || 0} ISSUES DETECTED` : 'IDLE'}
                badgeColor={scanResult?.issues?.length > 0 ? 'var(--fault)' : 'var(--steel)'}
              >
                {commitSuccess ? (
                  <div className="p-6 bg-sheet border border-steel/40 rounded text-center space-y-3 font-mono">
                    <div className="w-12 h-12 bg-steel/10 text-steel font-bold text-xl rounded-full flex items-center justify-center mx-auto">
                      ✓
                    </div>
                    <div className="text-sm font-bold text-graphite">{commitSuccess}</div>
                    <div className="text-xs text-graphite-3">
                      The cleaned readings have been committed to MongoDB Atlas storage and are now available for feature engineering and model inference.
                    </div>
                    <button
                      onClick={() => {
                        setScanResult(null);
                        setFile(null);
                        setCommitSuccess(null);
                      }}
                      className="px-4 py-2 bg-plate border border-line rounded text-xs font-mono font-bold text-graphite hover:border-hivis"
                    >
                      Upload Another Batch
                    </button>
                  </div>
                ) : scanResult ? (
                  <div className="space-y-4 pt-1 font-mono text-xs">
                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-plate p-2 rounded border border-line">
                        <div className="text-[10px] text-graphite-3 uppercase">Total Rows</div>
                        <div className="font-bold text-graphite text-sm">{scanResult.total_rows}</div>
                      </div>
                      <div className="bg-plate p-2 rounded border border-line">
                        <div className="text-[10px] text-graphite-3 uppercase">Detected Columns</div>
                        <div className="font-bold text-graphite text-sm">{scanResult.column_count}</div>
                      </div>
                      <div className="bg-plate p-2 rounded border border-line">
                        <div className="text-[10px] text-graphite-3 uppercase">Quality Flags</div>
                        <div className="font-bold text-fault text-sm">{scanResult.issues?.length || 0}</div>
                      </div>
                      <div className="bg-plate p-2 rounded border border-line">
                        <div className="text-[10px] text-graphite-3 uppercase">Proposed Fixes</div>
                        <div className="font-bold text-teal text-sm">{scanResult.proposals?.length || 0}</div>
                      </div>
                    </div>

                    {/* Quality Issues List */}
                    {scanResult.issues && scanResult.issues.length > 0 ? (
                      <div className="space-y-2">
                        <div className="font-bold text-graphite text-[11px] uppercase tracking-wider">
                          Identified Anomalies & Quality Failures:
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-line border border-line rounded bg-plate/40">
                          {scanResult.issues.map((iss: any, idx: number) => (
                            <div key={idx} className="p-2.5 flex items-start justify-between gap-3">
                              <div>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-fault/10 text-fault mr-2">
                                  {iss.kind}
                                </span>
                                <span className="font-bold text-graphite">{iss.column}</span>
                                <div className="text-[11px] text-graphite-3 mt-0.5">{iss.message}</div>
                              </div>
                              <span className="text-[10px] text-graphite-3 whitespace-nowrap">
                                Row #{iss.row_index !== undefined ? iss.row_index : 'All'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-steel/10 text-steel font-bold text-xs rounded">
                        ✓ No anomalies detected. Data format adheres cleanly to 2026 industrial requirements.
                      </div>
                    )}

                    {/* Proposed Fixes Selection */}
                    {scanResult.proposals && scanResult.proposals.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-line">
                        <div className="font-bold text-graphite text-[11px] uppercase tracking-wider">
                          Automated Rectifications (Check to Apply):
                        </div>
                        <div className="space-y-2">
                          {scanResult.proposals.map((prop: any, idx: number) => (
                            <label
                              key={idx}
                              className="flex items-center gap-2.5 p-2 bg-sheet border border-line rounded cursor-pointer hover:border-hivis transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFixes.includes(prop.issue_id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedFixes([...selectedFixes, prop.issue_id]);
                                  } else {
                                    setSelectedFixes(selectedFixes.filter(id => id !== prop.issue_id));
                                  }
                                }}
                                className="accent-hivis rounded"
                              />
                              <div className="text-xs">
                                <span className="font-bold text-graphite">{prop.title}</span>
                                <span className="text-graphite-3 ml-2 text-[11px]">({prop.description})</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-3 flex justify-end">
                      <button
                        onClick={handleApplyFixesAndRelease}
                        disabled={committing}
                        className="px-6 py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-2 shadow-xs"
                      >
                        {committing && <span className="w-3.5 h-3.5 border-2 border-graphite border-t-transparent rounded-full animate-spin" />}
                        Apply Fixes & Release to Database
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center font-mono text-xs text-graphite-3">
                    Awaiting CSV or Excel telemetry upload from Intake Shutter.
                  </div>
                )}
              </Plate>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUICK ENTRY GRID */}
      {activeTab === 'quick' && (
        <Plate title="MANUAL SENSOR TELEMETRY // FIELD DISPATCH ENTRY">
          <form onSubmit={handleQuickSubmit} className="space-y-4 pt-1 font-mono text-xs max-w-2xl">
            {quickSuccess && (
              <div className="p-3 bg-steel/10 text-steel font-bold rounded">
                ✓ Sensor reading recorded to database successfully!
              </div>
            )}
            <div>
              <label className="block text-[11px] text-graphite-3 uppercase mb-1">
                Target Machine Asset
              </label>
              <select
                value={selectedMachine}
                onChange={e => setSelectedMachine(e.target.value)}
                className="w-full bg-sheet border border-line p-2 rounded text-xs text-graphite focus:border-hivis outline-none"
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.type} ({m.line_id || 'Line Alpha'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase mb-1">
                  Vibration RMS (mm/s)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={vibration}
                  onChange={e => setVibration(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-xs text-graphite focus:border-hivis outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase mb-1">
                  Bearing Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={e => setTemp(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-xs text-graphite focus:border-hivis outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase mb-1">
                  Motor Current (A)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-xs text-graphite focus:border-hivis outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase mb-1">
                  Pressure (bar)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pressure}
                  onChange={e => setPressure(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-xs text-graphite focus:border-hivis outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-graphite-3 uppercase mb-1">
                  Drive Speed (RPM)
                </label>
                <input
                  type="number"
                  step="1.0"
                  value={speed}
                  onChange={e => setSpeed(e.target.value)}
                  className="w-full bg-sheet border border-line p-2 rounded text-xs text-graphite focus:border-hivis outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={quickSubmitting}
              className="py-2.5 px-6 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded uppercase tracking-wider transition-colors"
            >
              {quickSubmitting ? 'Logging Reading...' : 'Commit Single Telemetry Record'}
            </button>
          </form>
        </Plate>
      )}

      {/* TAB 3: MACHINE REGISTRY */}
      {activeTab === 'registry' && (
        <Plate title="ASSET REGISTRY // ACTIVE MONITORED MACHINES" badge={`${machines.length} UNITS`}>
          <div className="overflow-x-auto pt-1 font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-graphite-3 text-[10px] uppercase">
                  <th className="py-2 px-3">Asset ID / Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Line</th>
                  <th className="py-2 px-3">Criticality</th>
                  <th className="py-2 px-3">Downtime Cost</th>
                  <th className="py-2 px-3">Sensors</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {machines.map(m => (
                  <tr key={m.id} className="hover:bg-plate/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-graphite">{m.name}</td>
                    <td className="py-2.5 px-3 text-graphite-2">{m.type}</td>
                    <td className="py-2.5 px-3 text-graphite-3">{m.line_id || 'Line Alpha'}</td>
                    <td className="py-2.5 px-3">Tier {m.criticality}</td>
                    <td className="py-2.5 px-3 text-graphite-2">${m.downtime_cost_per_hour?.toLocaleString()}/hr</td>
                    <td className="py-2.5 px-3 text-graphite-3">{m.sensors?.length || 5} channels</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.state === 'Critical' ? 'bg-fault/10 text-fault' : 'bg-steel/10 text-steel'
                      }`}>
                        {m.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Plate>
      )}
    </motion.div>
  );
};
