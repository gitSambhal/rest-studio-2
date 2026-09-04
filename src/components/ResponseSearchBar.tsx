import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  Regex,
} from 'lucide-react';

interface ResponseSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (q: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  isCaseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  isRegex: boolean;
  onToggleRegex: () => void;
}

export const ResponseSearchBar: React.FC<ResponseSearchBarProps> = ({
  isOpen,
  onClose,
  query,
  onChangeQuery,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  isCaseSensitive,
  onToggleCaseSensitive,
  isRegex,
  onToggleRegex,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl text-xs z-30 animate-in fade-in slide-in-from-top-1 duration-150">
      <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
      
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in response... (Enter / Shift+Enter)"
        className="bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 text-xs w-48 sm:w-64 px-1"
      />

      {/* Match indicator */}
      <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[52px] text-center shrink-0">
        {query ? (matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : '0 of 0') : ''}
      </span>

      {/* Case Sensitive Toggle */}
      <button
        type="button"
        onClick={onToggleCaseSensitive}
        className={`p-1 rounded transition-colors ${
          isCaseSensitive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        title="Match Case (Case Sensitive)"
      >
        <span className="font-mono font-bold text-[10px] px-0.5">Aa</span>
      </button>

      {/* Regex Toggle */}
      <button
        type="button"
        onClick={onToggleRegex}
        className={`p-1 rounded transition-colors ${
          isRegex
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        title="Use Regular Expression"
      >
        <Regex className="w-3.5 h-3.5" />
      </button>

      <div className="h-4 w-px bg-slate-800 mx-0.5" />

      {/* Prev Match */}
      <button
        type="button"
        onClick={onPrevMatch}
        disabled={matchCount === 0}
        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-30 transition-colors"
        title="Previous Match (Shift+Enter)"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Next Match */}
      <button
        type="button"
        onClick={onNextMatch}
        disabled={matchCount === 0}
        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-30 transition-colors"
        title="Next Match (Enter)"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Close Search */}
      <button
        type="button"
        onClick={onClose}
        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors ml-0.5"
        title="Close (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
