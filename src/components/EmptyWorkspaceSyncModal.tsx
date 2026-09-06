import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  Download,
  Trash2,
  X,
  Check,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { SyncPayload, countWorkspaceEntities } from '../services/githubSyncService';

export interface EmptyWorkspaceSyncModalProps {
  isOpen: boolean;
  remotePayload: SyncPayload | null;
  isDarkMode?: boolean;
  onRestoreFromCloud: () => void;
  onConfirmEmptyCloud: () => void;
  onCancel: () => void;
}

export const EmptyWorkspaceSyncModal: React.FC<EmptyWorkspaceSyncModalProps> = ({
  isOpen,
  remotePayload,
  isDarkMode = true,
  onRestoreFromCloud,
  onConfirmEmptyCloud,
  onCancel,
}) => {
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');

  if (!isOpen) return null;

  const remoteStats = remotePayload
    ? countWorkspaceEntities(remotePayload.organizations)
    : { fileCount: 0, requestCount: 0, projectCount: 0, orgCount: 0 };

  const lastUpdatedFormatted = remotePayload?.updatedAt
    ? new Date(remotePayload.updatedAt).toLocaleString()
    : 'Unknown date';

  const handleClose = () => {
    setConfirmStep(false);
    setTypedConfirmation('');
    onCancel();
  };

  const handleEmptyCloudProceed = () => {
    if (typedConfirmation.trim().toUpperCase() !== 'EMPTY') return;
    setConfirmStep(false);
    setTypedConfirmation('');
    onConfirmEmptyCloud();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className={`w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
            isDarkMode
              ? 'bg-slate-900 border-amber-500/40 text-slate-100 shadow-amber-950/20'
              : 'bg-white border-amber-300 text-slate-900 shadow-slate-300'
          }`}
        >
          {/* Header Banner */}
          <div
            className={`p-4 border-b flex items-start justify-between ${
              isDarkMode
                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/30 border-slate-800'
                : 'bg-gradient-to-r from-amber-50 via-white to-rose-50 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>Cloud Sync: Local Workspace is Empty</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Notice: Syncing will empty your cloud backup unless restored.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="p-5 space-y-4">
            {/* Status Breakdown Box */}
            <div
              className={`grid grid-cols-2 gap-3 p-3.5 rounded-xl border text-xs ${
                isDarkMode
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Local Device</span>
                </div>
                <div className="text-sm font-bold text-amber-400">0 Collections • 0 Requests</div>
                <div className="text-[11px] text-slate-500">Workspace has been cleared</div>
              </div>

              <div className="space-y-1 border-l pl-3 border-slate-700/50">
                <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GitHub Cloud Backup</span>
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  {remoteStats.requestCount} Requests • {remoteStats.fileCount} Collections
                </div>
                <div className="text-[11px] text-slate-500 truncate" title={lastUpdatedFormatted}>
                  Updated: {lastUpdatedFormatted}
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Warning:</strong> You cleaned everything locally. If you synchronize your local
                state to GitHub Gist right now, <strong>it will empty the cloud backup</strong> and
                permanently erase all {remoteStats.requestCount} remote request(s).
              </div>
            </div>

            {/* Choice 1: Restore from Cloud (Safe / Recommended) */}
            {!confirmStep && (
              <div className="space-y-2.5 pt-1">
                <div className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Choose an action:
                </div>

                {/* Option A: Restore */}
                <button
                  type="button"
                  onClick={onRestoreFromCloud}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${
                    isDarkMode
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-500/70 text-slate-100'
                      : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 hover:border-emerald-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">
                        <span>Restore Collections from Cloud</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                          Recommended
                        </span>
                      </div>
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Recover all {remoteStats.requestCount} endpoint(s) and folders from GitHub Gist back to this device.
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Option B: Empty Cloud */}
                <button
                  type="button"
                  onClick={() => setConfirmStep(true)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${
                    isDarkMode
                      ? 'bg-rose-950/20 hover:bg-rose-950/35 border-rose-500/30 hover:border-rose-500/60 text-slate-200'
                      : 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 hover:border-rose-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-rose-400">
                        Overwrite & Empty Cloud Backup
                      </div>
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Sync your empty workspace to GitHub Gist, deleting all cloud requests to match this device.
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}

            {/* Confirmation Step for Destructive Empty Cloud */}
            {confirmStep && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border space-y-3 ${
                  isDarkMode
                    ? 'bg-rose-950/30 border-rose-500/40 text-slate-200'
                    : 'bg-rose-50 border-rose-200 text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Confirm: Empty Cloud Backup</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This will <strong>permanently delete</strong> all {remoteStats.requestCount} requests across {remoteStats.fileCount} collection(s) from your GitHub Gist.
                  This action cannot be undone.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block font-medium">
                    Type <strong className="text-rose-400">EMPTY</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={typedConfirmation}
                    onChange={(e) => setTypedConfirmation(e.target.value)}
                    placeholder="Type EMPTY to confirm"
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-1 ${
                      isDarkMode
                        ? 'bg-slate-950 border-rose-700/60 text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:ring-rose-500/50'
                        : 'bg-white border-rose-300 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-rose-500/50'
                    }`}
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmStep(false);
                      setTypedConfirmation('');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleEmptyCloudProceed}
                    disabled={typedConfirmation.trim().toUpperCase() !== 'EMPTY'}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-rose-600/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Empty Cloud</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal Footer */}
          {!confirmStep && (
            <div
              className={`p-4 border-t flex items-center justify-between ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Nothing is altered until you choose an option.
              </span>
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel / Do Nothing
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
