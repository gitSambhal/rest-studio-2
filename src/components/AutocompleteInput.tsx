import React, { useEffect, useRef, useState } from 'react';
import { EnvVariable, VariableLookupResult } from '../types';
import { ScopeContext, getEnvAutocompleteSuggestions, getVariableLookupDetails } from '../utils/envUtils';
import { VarTooltipCard, computeCardPosition } from './VarBadge';
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

interface TokenSegment {
  key: string;
  start: number;
  end: number;
  lookup: VariableLookupResult | null;
}

const TOKEN_REGEX = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;

function extractTokenSegments(value: string, ctx: ScopeContext): TokenSegment[] {
  const segments: TokenSegment[] = [];
  const regex = new RegExp(TOKEN_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = regex.exec(value)) !== null) {
    const key = m[1];
    segments.push({
      key,
      start: m.index,
      end: m.index + m[0].length,
      lookup: getVariableLookupDetails(key, ctx),
    });
  }
  return segments;
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
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hoveredToken, setHoveredToken] = useState<{ index: number; pos: { top?: number; bottom?: number; left: number } } | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const ctxToUse: ScopeContext = scopeCtx || {
    projectVariables: envVariables,
    fileVariables,
  };

  const autocomplete = getEnvAutocompleteSuggestions(value, cursorPos, ctxToUse);

  // Token segments drive the in-field highlight + hover cards (single-line only)
  const tokenSegments = isMultiline ? [] : extractTokenSegments(value, ctxToUse);
  const hoveredSegment = hoveredToken ? tokenSegments[hoveredToken.index] : null;

  // Close the hover card when the value changes so it never points at a stale token
  useEffect(() => {
    setHoveredToken(null);
  }, [value]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [autocomplete.query]);

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

  const placeCaretAtToken = (seg: TokenSegment) => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(seg.start, seg.start);
      setCursorPos(seg.start);
    }
  };

  // Render the highlighted token overlay for single-line inputs.
  // The real input sits on top with transparent text; this layer paints the
  // same text with tinted {{var}} chips and per-token hover cards.
  const renderHighlightOverlay = () => {
    if (tokenSegments.length === 0) return null;

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    tokenSegments.forEach((seg, idx) => {
      if (seg.start > cursor) {
        parts.push(<span key={`txt-${idx}`}>{value.slice(cursor, seg.start)}</span>);
      }
      const isMatched = !!seg.lookup;
      parts.push(
        <span
          key={`tok-${idx}`}
          onMouseDown={(e) => {
            e.preventDefault();
            placeCaretAtToken(seg);
          }}
          onMouseEnter={(e) => {
            setHoveredToken({ index: idx, pos: computeCardPosition(e.currentTarget.getBoundingClientRect()) });
          }}
          onMouseLeave={() => setHoveredToken(null)}
          className={`cursor-help rounded px-0.5 border ${
            isMatched
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}
        >
          {`{{${seg.key}}}`}
          {hoveredToken && hoveredToken.index === idx && hoveredSegment && (
            <VarTooltipCard varKey={seg.key} lookup={seg.lookup} popupPos={hoveredToken.pos} />
          )}
        </span>
      );
      cursor = seg.end;
    });
    if (cursor < value.length) {
      parts.push(<span key="tail">{value.slice(cursor)}</span>);
    }

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Scroll-synced via margin (not transform) so the fixed-position hover card
            inside keeps the viewport as its containing block and is never clipped. */}
        <div
          className="w-full font-mono text-sm px-3 py-2 border border-transparent whitespace-pre text-slate-100"
          style={{ marginLeft: `-${scrollLeft}px` }}
        >
          {parts}
        </div>
      </div>
    );
  };

  const commonInputHandlers = {
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setCursorPos(e.target.selectionStart || e.target.value.length);
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
          <>
            {renderHighlightOverlay()}
            <input
              id={id}
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              placeholder={placeholder}
              onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
              {...commonInputHandlers}
              className={`w-full font-mono text-sm px-3 py-2 bg-slate-900 border border-slate-700 ${
                tokenSegments.length > 0 ? 'text-transparent' : 'text-slate-100'
              } caret-emerald-400 placeholder:text-slate-500 selection:text-slate-100 selection:bg-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${className}`}
            />
          </>
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

      {/* Autocomplete Dropdown Popover */}
      {isFocused && autocomplete.show && (
        <div
          className="absolute z-[9999] left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-700/50 animate-in fade-in duration-100"
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
                      item.source === 'project'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.source === 'organization'
                        ? 'bg-purple-500/20 text-purple-300'
                        : item.source === 'folder'
                        ? 'bg-amber-500/20 text-amber-300'
                        : item.source === 'file'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {item.source}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
