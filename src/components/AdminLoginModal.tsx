import React, { useState } from 'react';
import { ShieldCheck, Lock, Key, AlertCircle, X, Terminal, CheckCircle2 } from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  currentPasscode: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentPasscode,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();

    // Verify passcode (Default ammar786 or custom)
    if (passcode.trim() === currentPasscode || passcode.trim() === 'ammar786' || passcode.trim() === '786') {
      setError('');
      setSuccess(true);
      sounds.playAuthSuccess();
      setTimeout(() => {
        setSuccess(false);
        setPasscode('');
        onLoginSuccess();
        onClose();
      }, 700);
    } else {
      sounds.playGameOver();
      setError('ACCESS DENIED: Invalid Admin Passcode!');
    }
  };

  const handleDigit = (digit: string) => {
    sounds.playClick();
    if (passcode.length < 16) {
      setPasscode((prev) => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    sounds.playClick();
    setPasscode((prev) => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080d1a] border-2 border-emerald-500/50 p-6 shadow-2xl shadow-emerald-950/50 text-slate-100 font-sans">
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-cyber text-white tracking-wide">
            ADMIN ROOT ACCESS
          </h2>
          <p className="text-xs font-mono text-emerald-400/80 mt-1">
            AMMAR H4CKER // OFFLINE AUTHENTICATION
          </p>
        </div>

        {/* Secure prompt (do not show passcode) */}
        <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs font-mono text-emerald-400/90 flex items-center justify-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>ENTER AUTHORIZED ADMIN PASSKEY</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError('');
                }}
                placeholder="Enter master passcode..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#040710] border border-emerald-500/40 text-white font-mono text-center tracking-widest text-lg placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                autoFocus
              />
              <Key className="w-5 h-5 text-emerald-400 absolute left-3.5 top-3.5" />
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400 font-mono animate-glitch">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>ACCESS GRANTED // WELCOME AMMAR!</span>
              </div>
            )}
          </div>

          {/* Quick Digit Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item === 'CLR') {
                    sounds.playClick();
                    setPasscode('');
                  } else if (item === '⌫') {
                    handleBackspace();
                  } else {
                    handleDigit(item);
                  }
                }}
                className="py-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 font-mono text-sm font-bold text-slate-200 active:scale-95 transition"
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-black font-cyber font-bold text-sm tracking-wider transition shadow-lg shadow-emerald-500/25 active:scale-98"
          >
            AUTHORIZE LOGIN
          </button>
        </form>
      </div>
    </div>
  );
};
