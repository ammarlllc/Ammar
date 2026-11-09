import React, { useState, useRef } from 'react';
import { Package, Download, Upload, HardDrive, CheckCircle2, AlertCircle, Loader2, X, Smartphone, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { vaultDb } from '../services/db';
import { sounds } from '../services/soundEffects';

interface ObbEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  totalVideosCount: number;
}

export const ObbEngineModal: React.FC<ObbEngineModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  totalVideosCount,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Export OBB Data File
  const handleExport = async () => {
    sounds.playClick();
    setIsExporting(true);
    setProgressPercent(0);
    setStatusMessage('Initializing OBB compiler...');
    setSuccessInfo(null);
    setErrorInfo(null);

    try {
      const result = await vaultDb.exportObbDataFile((pct, msg) => {
        setProgressPercent(pct);
        setStatusMessage(msg);
      });

      // Trigger file download
      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      sounds.playObbSuccess();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff4400', '#00ff88', '#00d0ff'],
        });
      } catch {
        // ignore
      }

      setSuccessInfo(
        `OBB Exported! "${result.fileName}" (${(result.sizeBytes / (1024 * 1024)).toFixed(2)} MB, ${result.videoCount} videos). Ab ye file dost ko send karein!`
      );
    } catch (err: unknown) {
      console.error(err);
      setErrorInfo(err instanceof Error ? err.message : 'Failed to export OBB file');
      sounds.playGameOver();
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Import / Restore OBB Data File
  const handleImportFile = async (file: File) => {
    sounds.playClick();
    setIsImporting(true);
    setProgressPercent(0);
    setStatusMessage('Reading OBB package file...');
    setSuccessInfo(null);
    setErrorInfo(null);

    try {
      const res = await vaultDb.importObbDataFile(file, (pct, msg) => {
        setProgressPercent(pct);
        setStatusMessage(msg);
      });

      sounds.playObbSuccess();
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#00ff88', '#ff3366', '#ffaa00'],
        });
      } catch {
        // ignore
      }

      setSuccessInfo(
        `OBB Flashed Successfully! ${res.importedCount} videos restored (${(res.totalBytes / (1024 * 1024)).toFixed(2)} MB). Sab videos offline chalenge!`
      );
      onDataChanged();
    } catch (err: unknown) {
      console.error(err);
      setErrorInfo(err instanceof Error ? err.message : 'Invalid or corrupted OBB file format.');
      sounds.playGameOver();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 rounded-2xl bg-[#080d19] border-2 border-orange-500/50 p-5 sm:p-7 shadow-2xl shadow-orange-950/50 text-slate-100 font-sans">
        {/* Close button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Cyber Data Archive styling */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Package className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-cyber text-white">
                AMMAR H4CKER OBB DATA ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/40 font-bold">
                PORTABLE V1.0
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Portable offline data package (.obb / .ammarpak) • Share & Play without internet!
            </p>
          </div>
        </div>

        {/* Explanation Card */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 mb-5">
          <h3 className="text-xs sm:text-sm font-bold font-cyber text-cyan-300 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            OBB DATA SYSTEM KAISA KAAM KARTA HA?
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Jaise Android apps me <code className="text-cyan-400 font-mono">.obb</code> data file poore data ko ek package me rakhti hai, waise hi AMMAR H4CKER aapki dali hui <strong>sabhi offline videos ko ek OBB Data File (.obb)</strong> me bundle kar deta hai!
          </p>

          {/* Step visual diagram */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px] font-mono">
            <div className="p-2.5 rounded-lg bg-[#050812] border border-cyan-500/20">
              <span className="text-cyan-400 font-bold block mb-1">1. EXPORT OBB</span>
              <p className="text-slate-400">Sab videos ka OBB file download karein</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#050812] border border-cyan-500/20">
              <span className="text-cyan-400 font-bold block mb-1">2. SHARE FILE</span>
              <p className="text-slate-400">WhatsApp / ShareMe / Bluetooth se send karein</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#050812] border border-cyan-500/20">
              <span className="text-cyan-400 font-bold block mb-1">3. LOAD & PLAY</span>
              <p className="text-slate-400">Doosre phone me Load OBB karein, bina net chalengi!</p>
            </div>
          </div>
        </div>

        {/* Current Vault Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-[#050812] border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block">TOTAL STORED VIDEOS</span>
            <span className="text-xl font-cyber font-bold text-white">{totalVideosCount} Videos</span>
          </div>
          <div className="p-3 rounded-xl bg-[#050812] border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block">OFFLINE ENGINE</span>
            <span className="text-xl font-cyber font-bold text-emerald-400">100% PERSISTENT</span>
          </div>
        </div>

        {/* Progress Bar (when exporting or importing) */}
        {(isExporting || isImporting) && (
          <div className="mb-5 p-4 rounded-xl bg-[#050812] border border-orange-500/40">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-orange-300 font-bold flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                {statusMessage}
              </span>
              <span className="text-white font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successInfo && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorInfo && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorInfo}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting || isImporting || totalVideosCount === 0}
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-cyber font-bold text-xs tracking-wider transition shadow-lg shadow-orange-950/60 active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT OBB DATA FILE</span>
          </button>

          {/* Import / Flash Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isImporting}
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-emerald-500/50 hover:border-emerald-400 disabled:opacity-50 text-emerald-300 font-cyber font-bold text-xs tracking-wider transition shadow-lg active:scale-98"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>LOAD / FLASH OBB FILE</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".obb,.ammarpak,.dat,.json"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleImportFile(selected);
            }}
          />
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-[11px] font-mono text-slate-500">
          File format: <code className="text-cyan-400">main.xxxx.com.ammar.hacker.obb</code> • Standalone Offline Archive
        </p>
      </div>
    </div>
  );
};
