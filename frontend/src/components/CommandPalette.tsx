import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const runCommand = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <div className="fixed inset-0 bg-graphite/40 backdrop-blur-xs z-50 flex items-start justify-center pt-24">
      <div className="bg-sheet border border-line rounded w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <Command label="Global Command Palette">
          <div className="flex items-center border-b border-line px-3 bg-plate">
            <span className="font-mono text-xs text-graphite-3 mr-2">›</span>
            <Command.Input
              placeholder="Search plant rooms, assets (PRESS-01), or maintenance actions..."
              className="w-full bg-transparent py-3 text-sm font-mono text-graphite outline-none placeholder:text-graphite-3"
              autoFocus
            />
            <kbd className="bg-sheet border border-line px-1.5 py-0.5 rounded text-[10px] font-mono text-graphite-3">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="p-4 text-center text-xs font-mono text-graphite-3">
              No matching assets or plant rooms found.
            </Command.Empty>

            <Command.Group heading="PLANT ROOMS (1–7)" className="text-[10px] font-mono uppercase text-graphite-3 px-2 py-1">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/floor'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">Plant Floor</span>
                <span className="font-mono text-[10px] text-graphite-3">SVG Minimap Home</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/receiving'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[1] Receiving</span>
                <span className="font-mono text-[10px] text-graphite-3">Scan & Fix Upload Wizard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/control'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[2] Control Room</span>
                <span className="font-mono text-[10px] text-graphite-3">Historical Trends & Compare</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/workshop'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[3] Workshop</span>
                <span className="font-mono text-[10px] text-graphite-3">Feature Assembly Line</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/lab'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[4] Lab</span>
                <span className="font-mono text-[10px] text-graphite-3">1U Model Rack & Training</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/bench'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[5] Bench</span>
                <span className="font-mono text-[10px] text-graphite-3">Scoreboard & Failure Replay</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/dispatch'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[6] Dispatch</span>
                <span className="font-mono text-[10px] text-graphite-3">Report Press & Exports</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/office'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <span className="font-bold text-graphite">[7] Office</span>
                <span className="font-mono text-[10px] text-graphite-3">Plan Calendar & Review</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="CRITICAL ASSETS" className="text-[10px] font-mono uppercase text-graphite-3 px-2 py-1 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/machines/PRESS-01'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <div>
                  <span className="font-bold text-graphite mr-2">PRESS-01</span>
                  <span className="text-graphite-2">Hydraulic Stamping Press</span>
                </div>
                <span className="text-[9px] font-mono px-1 rounded bg-fault text-white font-bold uppercase">CRITICAL</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/machines/COMP-05'))}
                className="px-2 py-2 rounded text-xs flex items-center justify-between hover:bg-hivis-wash cursor-pointer"
              >
                <div>
                  <span className="font-bold text-graphite mr-2">COMP-05</span>
                  <span className="text-graphite-2">Screw Air Compressor</span>
                </div>
                <span className="text-[9px] font-mono px-1 rounded bg-hivis text-white font-bold uppercase">ALERT</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
