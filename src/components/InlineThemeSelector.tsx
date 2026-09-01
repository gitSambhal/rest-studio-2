import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sun, Moon } from 'lucide-react';
import { THEMES, UIThemeId } from '../utils/themeManager';

interface InlineThemeSelectorProps {
  currentTheme: UIThemeId;
  onSelectTheme: (themeId: UIThemeId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const InlineThemeSelector: React.FC<InlineThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center shrink-0" ref={dropdownRef}>
      {/* Main Compact Theme Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-sm shrink-0 ${
          isOpen
            ? 'bg-slate-800 border-slate-700 text-slate-100'
            : isDarkMode
            ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-slate-100'
            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
        }`}
        title={`Current Theme: ${activeThemeObj.name} (Click for live preview switcher)`}
      >
        <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-semibold hidden lg:inline max-w-[90px] truncate">{activeThemeObj.name}</span>
        <div className="flex items-center space-x-1 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full border border-slate-600/60"
            style={{ backgroundColor: activeThemeObj.previewColors.primary }}
          />
        </div>
      </button>

      {/* Non-modal Live Preview Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-64 rounded-xl shadow-2xl z-50 p-2 border animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode
              ? 'bg-slate-900/95 border-slate-700 text-slate-100 backdrop-blur-md'
              : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-md shadow-slate-900/15'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1 text-emerald-400">
              <Palette className="w-3.5 h-3.5" />
              <span>Live Theme Switcher</span>
            </span>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer bg-slate-800/50 hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60"
              title="Toggle Dark/Light Mode"
            >
              {isDarkMode ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-none">
            {THEMES.map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    onSelectTheme(theme.id);
                  }}
                  className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold'
                      : isDarkMode
                      ? 'hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 border border-transparent'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {/* Swatch dots */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: theme.previewColors.bg }}
                        title="Background"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: theme.previewColors.primary }}
                        title="Accent"
                      />
                    </div>
                    <span className="truncate text-xs">{theme.name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                      theme.category === 'dark'
                        ? 'bg-slate-950 text-slate-400 border-slate-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {theme.category}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
