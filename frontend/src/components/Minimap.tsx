import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';

interface Room {
  id: number;
  key: string;
  code: string;
  name: string;
  path: string;
  desc: string;
  roles: string[];
}

const ROOMS: Room[] = [
  { id: 1, key: '1', code: 'RCV', name: 'Receiving', path: '/receiving', desc: 'Data Ingestion & Scan-Fix Wizard', roles: ['Admin', 'Reliability Engineer', 'Technician'] },
  { id: 2, key: '2', code: 'CTL', name: 'Control', path: '/control', desc: 'Historical Trends & Compare', roles: ['Admin', 'Reliability Engineer', 'Technician', 'Viewer'] },
  { id: 3, key: '3', code: 'WRK', name: 'Workshop', path: '/workshop', desc: 'DSP Feature Assembly Line', roles: ['Admin', 'Reliability Engineer'] },
  { id: 4, key: '4', code: 'LAB', name: 'Lab', path: '/lab', desc: '1U Model Rack & Train', roles: ['Admin', 'Reliability Engineer'] },
  { id: 5, key: '5', code: 'BNC', name: 'Bench', path: '/bench', desc: 'Evaluation Scoreboard & Replay', roles: ['Admin', 'Reliability Engineer', 'Viewer'] },
  { id: 6, key: '6', code: 'DSP', name: 'Dispatch', path: '/dispatch', desc: 'Report Press & Export Queue', roles: ['Admin', 'Reliability Engineer', 'Technician', 'Viewer'] },
  { id: 7, key: '7', code: 'OFC', name: 'Office', path: '/office', desc: 'Maintenance Plan & Alarm Review', roles: ['Admin', 'Reliability Engineer', 'Technician', 'Viewer'] },
];

interface MinimapProps {
  hasOpenAlarms?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({ hasOpenAlarms = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  // Keyboard navigation 1-7
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const room = ROOMS.find(r => r.key === e.key);
      if (room) {
        if (!user || room.roles.includes(user.role)) {
          navigate(room.path);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);

  return (
    <div className="flex items-center bg-plate/80 border border-line rounded-md p-1 shadow-xs select-none">
      <div className="hidden xl:flex flex-col pr-2 pl-1 border-r border-line/60 mr-1.5 font-mono">
        <span className="text-[9px] font-bold text-graphite-2 tracking-wider uppercase leading-none">ROOMS</span>
        <span className="text-[8px] text-graphite-3 uppercase leading-none mt-0.5">[1–7]</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {ROOMS.map(room => {
          const isActive = currentPath.startsWith(room.path);
          const hasAccess = !user || room.roles.includes(user.role);
          const isAlarmRoom = hasOpenAlarms && (room.id === 7 || room.id === 2);

          return (
            <motion.button
              key={room.id}
              whileHover={hasAccess ? { scale: 1.05, y: -1 } : {}}
              whileTap={hasAccess ? { scale: 0.95 } : {}}
              onClick={() => hasAccess && navigate(room.path)}
              disabled={!hasAccess}
              title={`[${room.key}] Room ${room.id}: ${room.name} — ${room.desc}`}
              className={`relative flex flex-col items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded transition-all font-mono ${
                isActive
                  ? 'bg-hivis text-graphite font-black shadow-xs ring-1 ring-hivis-deep'
                  : hasAccess
                  ? 'bg-sheet text-graphite-2 hover:text-graphite hover:border-graphite-3 border border-line/80'
                  : 'bg-plate/40 text-graphite-3/40 border border-line/40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center leading-none">
                <span className={`text-[11px] font-extrabold ${isActive ? 'text-graphite' : 'text-graphite'}`}>
                  {room.id}
                </span>
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-tighter leading-none mt-0.5 ${isActive ? 'text-graphite' : 'text-graphite-3'}`}>
                {room.code}
              </span>

              {/* Pulsing alert beacon on rooms with active alerts */}
              {isAlarmRoom && !isActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fault opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-fault" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
