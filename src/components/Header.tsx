import React, { useState } from 'react';
import { Shield, ShieldAlert, Lock, Unlock, UploadCloud, Flame, Volume2, VolumeX, Terminal, Sparkles, HardDrive } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { sounds } from '../services/soundEffects';

interface HeaderProps {
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  onOpenUpload: () => void;
  onOpenObbEngine: () => void;
  onLockVault: () => void;
  totalVideosCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onOpenAdminLogin,
  onAdminLogout,
  onOpenUpload,
  onOpenObbEngine,
  onLockVault,
  totalVideosCount,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.isMuted);

  const toggleSound = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#060a14]/90 backdrop-blur-md border-b border-emerald-500/30 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {/* Cyber Avatar Logo */}
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#091124] border border-emerald-500/50 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <span className="font-cyber font-black text-sm text-emerald-400">AH</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black font-cyber tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-300 glow-emerald">
                AMMAR H4CKER
              </h1>
              {isAdmin && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 text-[10px] font-mono font-bold animate-pulse">
                  <Shield className="w-2.5 h-2.5" />
                  ADMIN ROOT
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs font-mono text-slate-400 flex items-center gap-2">
              <span>OFFLINE VIDEO VAULT</span>
              <span className="text-emerald-500">•</span>
              <span className="text-emerald-400 font-semibold">{totalVideosCount} STORED</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* OBB Data Engine Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenObbEngine();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-bold transition shadow-md shadow-cyan-950/40 active:scale-95"
            title="Portable OBB Data Archive export & import"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">OBB DATA</span>
            <span>PACKAGE</span>
          </button>

          {/* Upload Video Button (Strictly Admin Only) */}
          {isAdmin ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenUpload();
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-cyber font-bold tracking-wider transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">UPLOAD VIDEO</span>
              <span className="sm:hidden">UPLOAD</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAdminLogin();
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-mono transition"
              title="Admin login required to upload videos"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">ADMIN UPLOAD ONLY</span>
              <span className="sm:hidden">UPLOAD (LOCK)</span>
            </button>
          )}

          {/* Admin Login / Logout */}
          {isAdmin ? (
            <button
              onClick={() => {
                sounds.playClick();
                onAdminLogout();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-mono transition"
              title="Logout from Admin Mode"
            >
              <Unlock className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden lg:inline">LOGOUT ADMIN</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAdminLogin();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-mono transition"
              title="Admin Login to upload videos"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">ADMIN LOGIN</span>
            </button>
          )}

          {/* Lock Vault / Return to Snake Cover */}
          <button
            onClick={() => {
              sounds.playClick();
              onLockVault();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-300 hover:text-white text-xs font-mono transition"
            title="Lock Vault & return to Snake cover game"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">CLOAK (SNAKE)</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white transition text-xs"
            title="Toggle Sound Effects"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
