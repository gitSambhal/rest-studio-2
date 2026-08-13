import React, { useState, useEffect } from 'react';
import { checkDesktopProxyHealth, DesktopProxyHealth } from '../utils/localhostBridge';
import {
  X,
  ShieldCheck,
  RefreshCw,
  Monitor,
  Zap,
} from 'lucide-react';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const [proxyHealth, setProxyHealth] = useState<DesktopProxyHealth>({ active: false, port: 3000 });
  const [isChecking, setIsChecking] = useState(false);

  const refreshHealth = async () => {
    setIsChecking(true);
    try {
      const h = await checkDesktopProxyHealth();
      setProxyHealth(h);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isNativeApp = typeof window !== 'undefined' && Boolean(
    (window as any).Neutralino ||
    (window as any).NL_PORT ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__ ||
    window.location.protocol === 'file:'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
          isDarkMode
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-emerald-950/30'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Monitor className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>RestStudio Desktop Connection</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  proxyHealth.active
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {proxyHealth.active ? '🟢 CONNECTED' : '⚪ DISCONNECTED'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect your web app directly to your computer&apos;s <code className="text-emerald-400 font-mono">localhost</code> APIs!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 max-h-[75vh]">
          {/* Status Box */}
          <div className={`p-4 rounded-xl border transition-all ${
            isNativeApp || proxyHealth.active
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${isNativeApp || proxyHealth.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm">
                    {isNativeApp
                      ? 'RestStudio Native Desktop App Running'
                      : proxyHealth.active
                        ? 'Desktop App Connected & Ready'
                        : 'Desktop App Disconnected'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isNativeApp ? (
                      <span>
                        RestStudio is running as a native desktop application. All HTTP requests to <code className="text-emerald-400 font-mono">localhost</code> execute natively on your computer with zero CORS restrictions.
                      </span>
                    ) : proxyHealth.active ? (
                      <span>
                        RestStudio Desktop App is open on your computer. Requests to <code className="text-emerald-400 font-mono">localhost</code> and local dev servers execute directly on your machine through an encrypted relay tunnel!
                      </span>
                    ) : (
                      <span>
                        To connect this web app to your local APIs on <code className="text-slate-200 font-mono">localhost</code>, simply launch the <strong>RestStudio Desktop Application</strong> on your computer. It connects automatically with zero configuration or terminal commands needed.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {!isNativeApp && (
                <button
                  type="button"
                  onClick={refreshHealth}
                  disabled={isChecking}
                  className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono px-3 py-1.5 rounded-lg border border-slate-700 transition-colors shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isChecking ? 'Checking...' : 'Re-check'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Instructions Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>How it works:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
              <li>Open the <strong>RestStudio Desktop App</strong> on your PC or Mac.</li>
              <li>The Desktop App establishes a secure background connection to your web session.</li>
              <li>Execute any HTTP request to <code className="text-emerald-400 font-mono">http://localhost:5000</code> or your local APIs—it connects seamlessly!</li>
            </ol>
          </div>

          {/* Capabilities */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
            <h5 className="font-bold text-emerald-400 text-xs flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Desktop Connection Features</span>
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Automatic connection on app launch</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Access localhost & local dev servers</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero configuration or terminal setup</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero CORS blocking</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span>Status:</span>
            <span className={`font-bold font-mono px-2 py-0.5 rounded border ${
              proxyHealth.active ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30' : 'text-amber-400 bg-amber-950/60 border-amber-500/30'
            }`}>
              {proxyHealth.active ? 'Desktop App Connected' : 'Waiting for Desktop App launch...'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
