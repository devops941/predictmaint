import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plate } from '../../components/Plate';
import { LabelTape } from '../../components/LabelTape';
import { apiRequest, BASE_URL } from '../../lib/api';

interface ReportTemplate {
  kind: string;
  title: string;
  code: string;
  description: string;
  recommendedFormat: 'pdf' | 'xlsx' | 'csv';
}

const TEMPLATES: ReportTemplate[] = [
  {
    kind: 'machine_health',
    title: 'Machine Health & Degradation Dossier',
    code: 'DOC-MH-01',
    description: 'Detailed sensor strip traces, FFT spectral peaks, RUL confidence intervals, and component degradation trajectory for selected machine asset.',
    recommendedFormat: 'pdf',
  },
  {
    kind: 'fleet_weekly',
    title: 'Plant Fleet Weekly Reliability Briefing',
    code: 'DOC-FW-02',
    description: 'Executive overview of all 12 monitored lines and machines, MTBF trends, top risk assets, and avoided downtime calculations for plant management.',
    recommendedFormat: 'pdf',
  },
  {
    kind: 'model_pack',
    title: 'Model Validation & Performance Pack',
    code: 'DOC-MV-03',
    description: 'Full data science audit trail: cross-validation PR-AUC, precision-recall curve coordinates, false alarm frequencies, and cost-threshold calculations.',
    recommendedFormat: 'xlsx',
  },
  {
    kind: 'maintenance_plan',
    title: 'Prioritized Maintenance Action Schedule',
    code: 'DOC-MA-04',
    description: 'Ranked list of upcoming 30-day maintenance actions sorted by financial criticality and failure risk probability with technician work windows.',
    recommendedFormat: 'csv',
  },
];

export const DispatchPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKind, setSelectedKind] = useState<string>('fleet_weekly');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const data = await apiRequest('/reports');
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setSuccessMsg(null);
    try {
      const res = await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({
          kind: selectedKind,
          format: selectedFormat,
        }),
      });
      setSuccessMsg(`Report generated successfully and staged in the Print Queue.`);
      fetchReports();
    } catch (err: any) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (report: any) => {
    const token = localStorage.getItem('pm_access_token');
    const url = `${BASE_URL}/reports/${report.id}/download`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${report.kind}_${report.id.slice(-6)}.${report.format}`;
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
            <LabelTape text="ROOM 6 // REPORT PRESS" color="var(--steel)" />
            <span className="font-mono text-xs text-graphite-3 uppercase tracking-wider">
              AUTOMATED COMPLIANCE DOSSIERS, EXCEL WORKBOOKS & AUDIT PACKS
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-graphite uppercase mt-1">
            Dispatch & Report Press
          </h1>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-steel/10 border border-steel/40 text-graphite font-mono text-xs rounded font-bold">
          ✓ {successMsg}
        </div>
      )}

      {/* 4 REPORT TEMPLATE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATES.map(tpl => {
          const isSelected = selectedKind === tpl.kind;
          return (
            <motion.div
              key={tpl.kind}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedKind(tpl.kind);
                setSelectedFormat(tpl.recommendedFormat);
              }}
              className={`bg-sheet border rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-hivis shadow-xs ring-2 ring-hivis/30 bg-hivis/5'
                  : 'border-line hover:border-graphite-3'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-line/60">
                  <span className="font-mono text-[10px] font-bold text-graphite-3">{tpl.code}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-plate text-graphite">
                    {tpl.recommendedFormat}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-display font-black text-xl text-graphite leading-snug">
                    {tpl.title}
                  </div>
                  <div className="text-xs text-graphite-2 mt-2 leading-relaxed">
                    {tpl.description}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between font-mono text-xs">
                <span className={`text-[11px] font-bold ${isSelected ? 'text-hivis' : 'text-graphite-3'}`}>
                  {isSelected ? '● SELECTED' : '○ CLICK TO SELECT'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* REPORT GENERATION CONFIGURATION STRIP */}
      <Plate title="REPORT PRESS CONTROLS // JOB LAUNCHER">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 font-mono text-xs items-end">
          <div>
            <label className="block text-[10px] text-graphite-3 uppercase mb-1">
              Active Template Target
            </label>
            <div className="p-2 bg-plate border border-line rounded font-bold text-graphite">
              {TEMPLATES.find(t => t.kind === selectedKind)?.title}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-graphite-3 uppercase mb-1">
              Export Encoding & Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['pdf', 'xlsx', 'csv'].map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={`p-2 rounded border text-center font-bold uppercase ${
                    selectedFormat === fmt
                      ? 'bg-hivis/10 border-hivis text-graphite'
                      : 'bg-plate border-line text-graphite-3 hover:text-graphite'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2.5 bg-hivis hover:bg-hivis-deep text-graphite font-bold rounded uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {generating && <span className="w-3.5 h-3.5 border-2 border-graphite border-t-transparent rounded-full animate-spin" />}
              {generating ? 'Pressing Document...' : 'Generate & Stage Document'}
            </button>
          </div>
        </div>
      </Plate>

      {/* PRINT QUEUE & RECENT REPORTS */}
      <Plate title="PRINT QUEUE // STAGED & DOWNLOADABLE ARTIFACTS" badge={`${reports.length} READY`}>
        <div className="overflow-x-auto pt-1 font-mono text-xs">
          {loading ? (
            <div className="py-8 text-center text-graphite-3">
              Checking printer spooler...
            </div>
          ) : reports.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-graphite-3 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">File Size</th>
                  <th className="py-2.5 px-3">Generated At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reports.map((rep: any) => (
                  <tr key={rep.id} className="hover:bg-plate/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-graphite">{rep.title}</td>
                    <td className="py-2.5 px-3 text-graphite-2 uppercase text-[10px]">{rep.kind}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-plate border border-line text-graphite">
                        {rep.format}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-graphite-3">
                      {rep.size_bytes ? `${Math.round(rep.size_bytes / 1024)} KB` : '32 KB'}
                    </td>
                    <td className="py-2.5 px-3 text-graphite-3">
                      {new Date(rep.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDownload(rep)}
                        className="px-3 py-1 bg-plate border border-line rounded text-graphite font-bold hover:border-hivis transition-colors"
                      >
                        Download ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-6 text-center text-graphite-3">
              No reports in queue. Launch a job above.
            </div>
          )}
        </div>
      </Plate>
    </motion.div>
  );
};
