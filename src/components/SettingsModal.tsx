import React, { useState, useEffect } from 'react';
import { X, Sliders, Moon, Sun, MonitorCheck, Monitor, Zap, Shield, RefreshCw } from 'lucide-react';
import { getProxyMode, setProxyMode, ProxyMode } from '../utils/httpExecutor';
import { checkDesktopProxyHealth, DesktopProxyHealth } from '../utils/localhostBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDesktopModal?: () => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onOpenDesktopModal,
  showToast,
}: SettingsModalProps) {
  const [proxyMode, setProxyModeState] = useState<ProxyMode>(() => getProxyMode());
  const [proxyHealth, setProxyHealth] = useState<DesktopProxyHealth>({ active: false, port: 28108 });

  useEffect(() => {
    if (isOpen) {
      checkDesktopProxyHealth().then(setProxyHealth);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in ${
      isDarkMode ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-900/40 backdrop-blur-sm'
    }`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl border ${
              isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Workspace Preferences</h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>General theme and application settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Theme Preference */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Appearance Theme
            </label>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                {isDarkMode ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <div className="text-left">
                  <div className="text-xs font-bold">{isDarkMode ? 'Dark Mode (Active)' : 'Light Mode (Active)'}</div>
                  <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Switch UI color scheme</div>
                </div>
              </div>
              <span className="text-xs text-emerald-500 font-medium">Toggle</span>
            </button>
          </div>

          {/* Proxy Execution Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                HTTP Request Proxy Mode
              </label>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                proxyHealth.active
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {proxyHealth.active ? '🟢 LOCALHOST AGENT ACTIVE' : '⚪ AGENT OFFLINE'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border space-y-3 ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Execution Proxy
                </span>
                <select
                  value={proxyMode}
                  onChange={(e) => {
                    const m = e.target.value as ProxyMode;
                    setProxyModeState(m);
                    setProxyMode(m);
                    showToast('info', 'Proxy Mode Updated', `Set to ${m}`);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'
                  }`}
                >
                  <option value="auto">⚡ Auto (Desktop Proxy -&gt; Cloud -&gt; Direct)</option>
                  <option value="desktop">🖥️ Force Desktop Agent (127.0.0.1:28108)</option>
                  <option value="cloud">☁️ Force Cloud Server Proxy</option>
                  <option value="direct">🌐 Direct Browser Fetch (CORS Enabled Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Localhost Proxy Agent enables direct calls to local APIs from Netlify web app.
                </p>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const h = await checkDesktopProxyHealth();
                      setProxyHealth(h);
                      showToast(
                        h.active ? 'success' : 'warning',
                        h.active ? 'Proxy Agent Active' : 'Proxy Agent Offline',
                        h.active ? 'Connected to http://127.0.0.1:28108' : 'Not running. Click Setup to launch.'
                      );
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    title="Re-check Proxy Agent Health"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {onOpenDesktopModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDesktopModal();
                      }}
                      className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-[11px] rounded-lg border border-teal-500/40 transition-colors cursor-pointer"
                    >
                      Setup
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Engine Status */}
          <div className={`p-3 rounded-xl border space-y-1.5 ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
              <MonitorCheck className="w-4 h-4 shrink-0" />
              <span>Native Desktop Engine</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              RestStudio auto-detects Neutralino or Tauri native desktop containers for 0 CORS restrictions and direct localhost access.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-end ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
