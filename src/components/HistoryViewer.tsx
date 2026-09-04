import React, { useState } from 'react';
import { RequestHistoryItem } from '../types';
import { History, Search, Trash2, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

interface HistoryViewerProps {
  history: RequestHistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (item: RequestHistoryItem) => void;
  isDarkMode?: boolean;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  history,
  onClearHistory,
  onSelectHistoryItem,
  isDarkMode = true,
}) => {
  const [filterText, setFilterText] = useState('');

  const filteredHistory = history.filter(
    (item) =>
      !filterText ||
      item.requestName.toLowerCase().includes(filterText.toLowerCase()) ||
      item.url.toLowerCase().includes(filterText.toLowerCase()) ||
      item.method.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-emerald-500" />
          <span className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Request Execution History</span>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>({history.length} items logged)</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search history logs..."
              className={`w-full border rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-emerald-500/50 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400'
              }`}
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center space-x-1.5 text-xs bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className={`border rounded-xl overflow-hidden divide-y ${isDarkMode ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-200'}`}>
          <div className={`grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider font-mono ${isDarkMode ? 'bg-slate-900/80 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
            <div className="col-span-2">Time</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Method</div>
            <div className="col-span-3">Request Name</div>
            <div className="col-span-3">URL</div>
            <div className="col-span-2 text-right">Duration / Action</div>
          </div>

          {filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectHistoryItem(item)}
              className={`grid grid-cols-12 px-4 py-3 items-center font-mono text-xs cursor-pointer transition-colors group ${
                isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-slate-100'
              }`}
            >
              <div className={`col-span-2 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>

              <div className="col-span-1">
                {item.status >= 200 && item.status < 300 ? (
                  <span className="text-emerald-500 font-bold text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {item.status}
                  </span>
                ) : (
                  <span className="text-rose-500 font-bold text-[11px] bg-rose-500/10 px-1.5 py-0.5 rounded">
                    {item.status}
                  </span>
                )}
              </div>

              <div className={`col-span-1 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.method}</div>
              <div className={`col-span-3 font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.requestName}</div>
              <div className={`col-span-3 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.resolvedUrl}</div>

              <div className="col-span-2 text-right flex items-center justify-end space-x-2">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.duration} ms</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}

          {filteredHistory.length === 0 && (
            <div className={`py-16 text-center text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No request history recorded yet. Execute requests in the Request Builder.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
