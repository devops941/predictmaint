import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Minimap } from './Minimap';
import { ContextPlate } from './ContextPlate';

interface HeaderProps {
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-16 md:h-20 bg-sheet border-b border-line px-4 md:px-6 flex items-center justify-between shadow-xs select-none sticky top-0 z-40 transition-all">
      {/* Left: Industrial Wordmark & Context */}
      <div className="flex items-center gap-4 lg:gap-6">
        <Link to={isAuthenticated ? '/floor' : '/'} className="group flex items-center gap-2.5">
          <div className="w-9 h-9 bg-hivis rounded flex items-center justify-center font-display font-extrabold text-graphite text-xl tracking-tighter group-hover:bg-hivis-deep transition-colors shadow-xs">
            PM
          </div>
          <div>
            <div className="font-display font-black text-xl md:text-2xl tracking-wider text-graphite leading-none uppercase">
              PREDICTMAINT<span className="text-hivis">.AI</span>
            </div>
            <div className="font-mono text-[9px] text-graphite-3 tracking-widest uppercase mt-0.5 hidden sm:block">
              INDUSTRIAL MAINTENANCE INTELLIGENCE
            </div>
          </div>
        </Link>

        {isAuthenticated && (
          <div className="hidden xl:block ml-2 border-l border-line pl-4">
            <ContextPlate />
          </div>
        )}
      </div>

      {/* Right: Quick actions, Minimap, and User profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {isAuthenticated ? (
          <>
            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden lg:flex items-center gap-2 bg-plate border border-line px-2.5 py-1.5 rounded text-xs font-mono text-graphite-2 hover:border-hivis transition-colors"
            >
              <span className="text-graphite-3 text-[11px]">SEARCH</span>
              <kbd className="bg-sheet border border-line px-1.5 py-0.5 rounded text-[10px] font-bold">⌘K</kbd>
            </button>

            {/* Minimap Widget */}
            <div className="hidden md:block">
              <Minimap />
            </div>

            {/* User Profile Slot */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 bg-plate border border-line px-2.5 py-1.5 rounded hover:border-graphite-3 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-graphite text-white font-mono text-xs font-bold flex items-center justify-center">
                  {user?.name?.charAt(0) || 'O'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-graphite truncate max-w-[130px] leading-tight">
                    {user?.name || 'Operator'}
                  </div>
                  <div className="text-[9px] font-mono text-graphite-3 uppercase tracking-wider">
                    {user?.role || 'Technician'}
                  </div>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-sheet border border-line rounded shadow-lg z-50 p-2 font-mono">
                  <div className="px-2 py-1 text-xs text-graphite-2 border-b border-line mb-1">
                    <div className="font-bold text-graphite">{user?.name}</div>
                    <div className="text-[10px] text-graphite-3 truncate">{user?.email}</div>
                  </div>
                  <Link
                    to="/floor"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-2 py-1.5 text-xs text-graphite hover:bg-plate rounded font-mono"
                  >
                    Plant Floor Map
                  </Link>
                  <Link
                    to="/office"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-2 py-1.5 text-xs text-graphite hover:bg-plate rounded font-mono"
                  >
                    Office & Plan (Room 7)
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-fault hover:bg-plate rounded font-mono font-bold mt-1"
                  >
                    Disconnect Session
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 bg-hivis hover:bg-hivis-deep text-graphite font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-xs"
          >
            Control Login
          </Link>
        )}
      </div>
    </header>
  );
};
