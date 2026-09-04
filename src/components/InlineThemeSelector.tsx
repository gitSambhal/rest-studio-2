import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Check,
  Sun,
  Moon,
  Zap,
  Terminal,
  Sparkles,
  Compass,
  BookOpen,
} from 'lucide-react';
import { THEMES, UIThemeId, UITheme } from '../utils/themeManager';

interface InlineThemeSelectorProps {
  currentTheme: UIThemeId;
  onSelectTheme: (themeId: UIThemeId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const getThemeIcon = (iconType: UITheme['iconType'], className = 'w-3.5 h-3.5') => {
  switch (iconType) {
    case 'sun':
      return <Sun className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'terminal':
      return <Terminal className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'palette':
    default:
      return <Palette className={className} />;
  }
};

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
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 ${
          isOpen
            ? 'bg-slate-800 border-slate-700 text-slate-100 ring-1 ring-emerald-500/40'
            : isDarkMode
            ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white'
            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 hover:text-slate-950'
        }`}
        title={`Active Theme: ${activeThemeObj.name} (Click to switch themes)`}
      >
        <span style={{ color: activeThemeObj.previewColors.primary }} className="shrink-0 flex items-center">
          {getThemeIcon(activeThemeObj.iconType, 'w-3.5 h-3.5')}
        </span>
        <span className="font-semibold hidden lg:inline max-w-[100px] truncate">{activeThemeObj.name}</span>
        <div className="flex items-center space-x-1 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full border border-slate-600/60 shadow-inner"
            style={{ backgroundColor: activeThemeObj.previewColors.primary }}
          />
        </div>
      </button>

      {/* Non-modal Live Preview Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-72 rounded-xl shadow-2xl z-[999] p-2 border animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-700 text-slate-100 backdrop-blur-md shadow-black/80'
              : 'bg-white border-slate-200 text-slate-900 backdrop-blur-md shadow-slate-900/20'
          }`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-800/80 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5 text-emerald-400">
              <Palette className="w-3.5 h-3.5" />
              <span>UI Themes ({THEMES.length})</span>
            </span>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`text-[10px] font-semibold flex items-center space-x-1 cursor-pointer px-2 py-0.5 rounded border transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:text-amber-300 border-slate-700 hover:bg-slate-750'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle Dark/Light Mode"
            >
              {isDarkMode ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-500" />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {/* Theme List */}
          <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-none">
            {THEMES.map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    onSelectTheme(theme.id);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold shadow-sm'
                      : isDarkMode
                      ? 'hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 border border-transparent'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {/* Theme Dedicated Icon */}
                    <div
                      className="p-1 rounded-md shrink-0 flex items-center justify-center border border-slate-700/50 shadow-inner"
                      style={{
                        backgroundColor: theme.previewColors.surface,
                        color: theme.previewColors.primary,
                      }}
                    >
                      {getThemeIcon(theme.iconType, 'w-3.5 h-3.5')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-xs truncate">{theme.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {theme.category === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Color Swatch Pill */}
                    <div
                      className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full border border-slate-700/60 shadow-inner"
                      style={{ backgroundColor: theme.previewColors.bg }}
                    >
                      <span
                        className="w-2 h-2 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.previewColors.surface }}
                        title="Surface"
                      />
                      <span
                        className="w-2 h-2 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.previewColors.primary }}
                        title="Primary"
                      />
                    </div>

                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
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
