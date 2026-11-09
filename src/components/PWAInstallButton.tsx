import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sounds } from '../services/soundEffects';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA mode, don't show prompt
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        APP INSTALLED
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={() => {
          sounds.playClick();
          install();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20 active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>INSTALL APP</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => {
            sounds.playClick();
            setShowIOSGuide(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-mono transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>INSTALL PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#090d1a] border border-emerald-500/40 p-6 shadow-2xl relative text-slate-100 font-sans">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-cyber">Install on iPhone / iPad</h3>
              </div>
              <p className="text-sm text-slate-300 space-y-2">
                1. Tap the <strong className="text-emerald-400">Share</strong> icon in Safari toolbar.<br />
                2. Scroll down and select <strong className="text-emerald-400">Add to Home Screen</strong>.<br />
                3. Open <strong>AMMAR H4CKER</strong> anytime 100% offline!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm rounded-lg transition"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
