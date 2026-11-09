import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  itemCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message,
  itemCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#090d19] border-2 border-red-500/50 p-6 shadow-2xl shadow-red-950/60 text-slate-100">
        <button
          onClick={() => {
            sounds.playClick();
            onCancel();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-red-950/70 border border-red-500/50 text-red-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-cyber font-bold text-white">CONFIRM DELETION</h3>
            <p className="text-xs font-mono text-red-400/90">
              AMMAR H4CKER // OFFLINE VAULT DESTRUCTION
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/20 mb-5">
          <p className="text-sm font-semibold text-white truncate mb-1">
            {itemCount ? `${itemCount} Selected Videos` : title}
          </p>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {message || 'Are you sure you want to permanently delete this video? It will be removed from offline IndexedDB storage and cannot be recovered.'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playGameOver();
              onConfirm();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-cyber font-bold text-xs tracking-wider transition shadow-lg shadow-red-950 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>YES, DELETE PERMANENTLY</span>
          </button>
        </div>
      </div>
    </div>
  );
};
