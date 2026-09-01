import React from 'react';
import { X, Sliders, Moon, Sun, MonitorCheck, Palette, Check } from 'lucide-react';
import { THEMES, UIThemeId } from '../utils/themeManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentTheme?: UIThemeId;
  onSelectTheme?: (themeId: UIThemeId) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  currentTheme = 'dark',
  onSelectTheme,
  showToast,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in ${
      isDarkMode ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-900/40 backdrop-blur-sm'
    }`}>
      <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${
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
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] scrollbar-none">
          {/* Multiple UI Themes Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-2 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>UI Theme Preset ({THEMES.length} Themes)</span>
              </label>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center space-x-1"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>Toggle Dark/Light Mode</span>
              </button>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEMES.map((theme) => {
                const isActive = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      if (onSelectTheme) {
                        onSelectTheme(theme.id);
                        showToast('info', 'Theme Applied', `Switched workspace theme to ${theme.name}`);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 group ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30'
                        : isDarkMode
                        ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between space-x-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold ${
                            isActive
                              ? 'text-emerald-400'
                              : isDarkMode
                              ? 'text-slate-200 group-hover:text-slate-100'
                              : 'text-slate-800 group-hover:text-slate-900'
                          }`}>
                            {theme.name}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                            theme.category === 'dark'
                              ? 'bg-slate-900 text-slate-400 border-slate-800'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {theme.category}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-tight mt-1 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {theme.description}
                        </p>
                      </div>

                      {isActive && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center space-x-1.5 pt-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                        style={{ backgroundColor: theme.previewColors.bg }}
                        title="Canvas Color"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                        style={{ backgroundColor: theme.previewColors.surface }}
                        title="Surface Color"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                        style={{ backgroundColor: theme.previewColors.border }}
                        title="Border Color"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                        style={{ backgroundColor: theme.previewColors.primary }}
                        title="Primary Accent"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Local Network Access Note */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Local Network Access
            </label>
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                When the web app is hosted on a public <b>https</b> site, the browser (Chrome 142+) shows a native
                <b>Local Network Access</b> prompt the first time you send a request to localhost or a device on your
                local network — click <b>Allow</b>, no proxy or extension required.
              </p>
              <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Chrome only asks <b>once</b> — after a denial it never prompts again, and Site settings is the only way
                to restore access. In Chrome 145+ Site settings lists two separate entries:
                localhost / <code className="text-emerald-400">127.0.0.1</code> needs <b>Apps on device</b>,
                LAN devices need <b>Local Network</b> (Chrome 142–144 use a single <b>Local network access</b> entry).
              </p>
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
              The desktop build runs on Neutralino and executes requests natively with cURL — zero CORS restrictions,
              direct localhost access, fully independent from the web app.
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
