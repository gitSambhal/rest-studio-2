import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EnvVariable } from '../types';
import { ScopeContext, getEnvAutocompleteSuggestions } from '../utils/envUtils';
import { Variable } from 'lucide-react';

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  scopeCtx?: ScopeContext;
  envVariables?: EnvVariable[];
  fileVariables?: Record<string, string>;
  className?: string;
  isMultiline?: boolean;
  rows?: number;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Enter text or {{variable}}...',
  scopeCtx,
  envVariables = [],
  fileVariables = {},
  className = '',
  isMultiline = false,
  rows = 6,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const renderHighlightedText = (str: string) => {
    if (!str) return null;
    const parts = str.split(/(\{\{[a-zA-Z0-9_$.-]+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{\{([a-zA-Z0-9_$.-]+)\}\}$/);
      if (match) {
        return (
          <span
            key={i}
            className="inline-flex items-center bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded px-1 py-0.5 text-xs font-bold mx-0.5 align-baseline"
          >
            {part}
          </span>
        );
      }
      return <span key={i} className="text-slate-100">{part}</span>;
    });
  };

  const ctxToUse: ScopeContext = scopeCtx || {
    projectVariables: envVariables,
    fileVariables,
  };

  const autocomplete = getEnvAutocompleteSuggestions(value, cursorPos, ctxToUse);

  useEffect(() => {
    setSelectedIndex(0);
  }, [autocomplete.query]);

  // Position the floating suggestions popover below the input (flipping above
  // near the viewport bottom) and keep it anchored while the user scrolls or
  // resizes — capture-phase scroll catches container scrolls (e.g. the body
  // editor's overflow container), so suggestions stay visible without having
  // to scroll to them.
  useEffect(() => {
    if (!(isFocused && autocomplete.show)) {
      setDropdownPos(null);
      return;
    }
    const position = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 240), vw - 16);
      const left = Math.min(Math.max(8, rect.left), Math.max(8, vw - width - 8));
      const maxDropdownHeight = 240;
      const spaceBelow = vh - rect.bottom - 8;
      if (spaceBelow >= 120) {
        // Room below: open downward, clamped so it never overflows the viewport.
        setDropdownPos({ top: rect.bottom + 4, left, width, maxHeight: Math.min(maxDropdownHeight, spaceBelow) });
      } else {
        // Not enough room below: flip above, clamped so it never overflows the top.
        setDropdownPos({ bottom: vh - rect.top + 4, left, width, maxHeight: Math.min(maxDropdownHeight, Math.max(40, rect.top - 8)) });
      }
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [isFocused, autocomplete.show, autocomplete.query]);

  const insertSuggestion = (suggestionKey: string) => {
    if (autocomplete.startIndex === -1) return;

    const before = value.slice(0, autocomplete.startIndex);
    let after = value.slice(cursorPos);
    if (after.startsWith('}}')) {
      after = after.slice(2);
    } else if (after.startsWith('}')) {
      after = after.slice(1);
    }
    const newValue = `${before}{{${suggestionKey}}}${after}`;

    onChange(newValue);

    // Focus back and set cursor position right after }}
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = before.length + suggestionKey.length + 4; // {{key}}
        inputRef.current.setSelectionRange(newPos, newPos);
        setCursorPos(newPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      const pos = inputRef.current?.selectionStart || value.length;
      setCursorPos(pos);
      return;
    }

    if (autocomplete.show) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % autocomplete.suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + autocomplete.suggestions.length) % autocomplete.suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (autocomplete.suggestions[selectedIndex]) {
          insertSuggestion(autocomplete.suggestions[selectedIndex].key);
        }
      } else if (e.key === 'Escape') {
        // Close suggestion
        setCursorPos(0);
      }
    }
  };

  const handleSelectVarButtonClick = () => {
    // Manually trigger {{ at current cursor or end
    const pos = inputRef.current?.selectionStart || value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const newValue = `${before}{{${after}`;
    onChange(newValue);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = pos + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
        setCursorPos(newPos);
      }
    }, 10);
  };

  const commonInputHandlers = {
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const rawVal = e.target.value;
      onChange(rawVal);
      setCursorPos(e.target.selectionStart || rawVal.length);
    },
    onKeyDown: handleKeyDown,
    onSelect: (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCursorPos((e.target as HTMLInputElement).selectionStart || 0);
    },
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsFocused(true);
      setCursorPos(e.target.selectionStart || value.length);
    },
    onBlur: () => {
      setTimeout(() => setIsFocused(false), 200);
    },
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        {isMultiline ? (
          <textarea
            id={id}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            value={value}
            placeholder={placeholder}
            {...commonInputHandlers}
            className={`w-full font-mono text-xs p-3 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 leading-relaxed transition-all ${className}`}
          />
        ) : (
          <div className="relative w-full flex items-center overflow-hidden rounded-lg bg-slate-900 border border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all">
            {/* Backdrop Highlight Layer */}
            <div
              ref={backdropRef}
              className="absolute inset-0 px-3 py-2 pr-9 pointer-events-none flex items-center overflow-x-hidden font-mono text-sm whitespace-pre text-slate-100 z-0 select-none"
              aria-hidden="true"
            >
              {renderHighlightedText(value)}
            </div>

            {/* Transparent Input Layer */}
            <input
              id={id}
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              placeholder={placeholder}
              {...commonInputHandlers}
              onScroll={handleScroll}
              className={`w-full font-mono text-sm px-3 py-2 pr-9 bg-transparent text-transparent caret-emerald-400 placeholder:text-slate-500 selection:text-transparent selection:bg-emerald-500/30 focus:outline-none transition-all z-10 ${className}`}
            />
          </div>
        )}

        {/* Action Button: Insert Variable */}
        <button
          type="button"
          onClick={handleSelectVarButtonClick}
          title="Insert Environment Variable {{...}}"
          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
        >
          <Variable className="w-4 h-4" />
        </button>
      </div>

      {/* Autocomplete Suggestions — floating popover portaled to <body> so it
          overlays content and is never hidden inside a scrollable section. */}
      {isFocused && autocomplete.show && dropdownPos && createPortal(
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: dropdownPos.top !== undefined ? dropdownPos.top : 'auto',
            bottom: dropdownPos.bottom !== undefined ? dropdownPos.bottom : 'auto',
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: dropdownPos.maxHeight,
          }}
          className="z-[9999] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-700/50 animate-in fade-in duration-100"
        >
          <div className="px-3 py-1.5 bg-slate-900/80 text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Environment Variable Autocomplete</span>
            <span className="text-[10px] text-emerald-400 font-mono">Press Enter / Tab / Ctrl+Space to select</span>
          </div>

          {autocomplete.suggestions.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.key + '_' + index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertSuggestion(item.key);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-emerald-600/20 border-l-2 border-emerald-500 text-white' : 'hover:bg-slate-700/50 text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">{`{{${item.key}}}`}</span>
                  {item.description && <span className="text-xs text-slate-400 truncate max-w-[200px]">{item.description}</span>}
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/50 max-w-[150px] truncate">
                    {item.secret ? '••••••••' : item.value}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-semibold px-1 py-0.5 rounded ${
                      item.source === 'local' || item.source === 'file'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.source === 'env' || item.source === 'project'
                        ? 'bg-sky-500/20 text-sky-300'
                        : item.source === 'org' || item.source === 'organization'
                        ? 'bg-purple-500/20 text-purple-300'
                        : item.source === 'global'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {item.source === 'file' ? 'local' : item.source === 'project' ? 'env' : item.source === 'organization' ? 'org' : item.source}
                  </span>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
