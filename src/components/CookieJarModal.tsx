import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CookieItem } from '../types';
import {
  getAllCookies,
  deleteCookie,
  clearAllCookies,
  clearCookiesForDomain,
  addOrUpdateCookie,
  isCookieJarEnabled,
  setCookieJarEnabled,
} from '../utils/cookieJar';
import {
  Cookie,
  Trash2,
  Plus,
  Search,
  X,
  Copy,
  Check,
  Shield,
  Clock,
  Globe,
  Lock,
  Calendar,
  AlertCircle,
  Sparkles,
  Edit2,
  Download,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';

interface CookieJarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRequestUrl?: string;
}

export const CookieJarModal: React.FC<CookieJarModalProps> = ({
  isOpen,
  onClose,
  currentRequestUrl,
}) => {
  const [cookies, setCookies] = useState<CookieItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAutoEnabled, setIsAutoEnabled] = useState<boolean>(true);
  const [isAddingCookie, setIsAddingCookie] = useState(false);
  const [editingCookieId, setEditingCookieId] = useState<string | null>(null);

  const [cookieForm, setCookieForm] = useState({
    name: '',
    value: '',
    domain: '',
    path: '/',
    expires: '',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  });

  const reloadCookies = () => {
    setCookies(getAllCookies());
    setIsAutoEnabled(isCookieJarEnabled());
  };

  useEffect(() => {
    if (isOpen) {
      reloadCookies();
      if (currentRequestUrl) {
        try {
          const u = new URL(currentRequestUrl.startsWith('http') ? currentRequestUrl : `http://${currentRequestUrl}`);
          setCookieForm((prev) => ({
            ...prev,
            domain: u.hostname,
            path: u.pathname || '/',
          }));
        } catch (_) {}
      }
    }
  }, [isOpen, currentRequestUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleUpdate = () => reloadCookies();
    window.addEventListener('reststudio_cookies_updated', handleUpdate);
    return () => window.removeEventListener('reststudio_cookies_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleToggleAuto = () => {
    const next = !isAutoEnabled;
    setIsAutoEnabled(next);
    setCookieJarEnabled(next);
  };

  // Filter cookies
  const filteredCookies = cookies.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.path.toLowerCase().includes(q)
    );
  });

  // Group by domain
  const domainGroups: Record<string, CookieItem[]> = {};
  for (const c of filteredCookies) {
    const d = c.domain || 'unknown';
    if (!domainGroups[d]) domainGroups[d] = [];
    domainGroups[d].push(c);
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleStartAdd = () => {
    setEditingCookieId(null);
    let defaultDom = '';
    let defaultPth = '/';
    if (currentRequestUrl) {
      try {
        const u = new URL(currentRequestUrl.startsWith('http') ? currentRequestUrl : `http://${currentRequestUrl}`);
        defaultDom = u.hostname;
        defaultPth = u.pathname || '/';
      } catch (_) {}
    }
    setCookieForm({
      name: '',
      value: '',
      domain: defaultDom,
      path: defaultPth,
      expires: '',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    });
    setIsAddingCookie(true);
  };

  const handleStartEdit = (cookie: CookieItem) => {
    setEditingCookieId(cookie.id);
    setCookieForm({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires || '',
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite || 'Lax',
    });
    setIsAddingCookie(true);
  };

  const handleSaveCookieForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cookieForm.name.trim() || !cookieForm.domain.trim()) return;

    addOrUpdateCookie({
      id: editingCookieId || undefined,
      name: cookieForm.name.trim(),
      value: cookieForm.value,
      domain: cookieForm.domain.trim(),
      path: cookieForm.path.trim() || '/',
      expires: cookieForm.expires ? new Date(cookieForm.expires).toUTCString() : undefined,
      httpOnly: cookieForm.httpOnly,
      secure: cookieForm.secure,
      sameSite: cookieForm.sameSite,
    });

    setIsAddingCookie(false);
    setEditingCookieId(null);
    setCookieForm({
      name: '',
      value: '',
      domain: '',
      path: '/',
      expires: '',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    });
    reloadCookies();
  };

  const handleExportCookies = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cookies, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `reststudio_cookies_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-bold text-slate-100">Automatic Cookie Jar</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {cookies.length} {cookies.length === 1 ? 'cookie' : 'cookies'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono flex items-center space-x-1 ${
                    isAutoEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAutoEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{isAutoEnabled ? 'Auto-Capture ON' : 'Disabled'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Captures Set-Cookie response headers and automatically injects matching domain cookies into outgoing requests.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggleAuto}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                isAutoEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Automatic Cookie Jar behavior"
            >
              {isAutoEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
              <span>{isAutoEnabled ? 'Active' : 'Paused'}</span>
            </button>

            <button
              type="button"
              onClick={handleStartAdd}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Cookie</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cookies by name, value, domain, or path..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {cookies.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportCookies}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-700 flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer"
                  title="Export cookies to JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all cookies in the jar?')) {
                      clearAllCookies();
                      reloadCookies();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Add/Edit Cookie Form */}
        {isAddingCookie && (
          <form onSubmit={handleSaveCookieForm} className="p-4 bg-slate-950 border-b border-slate-800 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{editingCookieId ? 'Edit Cookie' : 'Create New Cookie'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCookie(false);
                  setEditingCookieId(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cookie Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. session_id"
                  value={cookieForm.name}
                  onChange={(e) => setCookieForm({ ...cookieForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cookie Value</label>
                <input
                  type="text"
                  placeholder="e.g. secret_token_xyz"
                  value={cookieForm.value}
                  onChange={(e) => setCookieForm({ ...cookieForm, value: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. api.example.com"
                  value={cookieForm.domain}
                  onChange={(e) => setCookieForm({ ...cookieForm, domain: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Path</label>
                <input
                  type="text"
                  placeholder="/"
                  value={cookieForm.path}
                  onChange={(e) => setCookieForm({ ...cookieForm, path: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={cookieForm.httpOnly}
                    onChange={(e) => setCookieForm({ ...cookieForm, httpOnly: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>HttpOnly</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={cookieForm.secure}
                    onChange={(e) => setCookieForm({ ...cookieForm, secure: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>Secure</span>
                </label>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <span>SameSite:</span>
                  <select
                    value={cookieForm.sameSite}
                    onChange={(e) => setCookieForm({ ...cookieForm, sameSite: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200"
                  >
                    <option value="Lax">Lax</option>
                    <option value="Strict">Strict</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCookie(false);
                    setEditingCookieId(null);
                  }}
                  className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer"
                >
                  {editingCookieId ? 'Update Cookie' : 'Save Cookie'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.keys(domainGroups).length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
                <Cookie className="w-6 h-6 text-amber-400/80" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">No cookies found in the jar</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cookies set via response headers (`Set-Cookie`) will automatically appear here and be attached to future requests for matching domains.
              </p>
              <button
                type="button"
                onClick={() => {
                  addOrUpdateCookie({
                    name: 'auth_token',
                    value: 'demo_session_' + Math.random().toString(36).substring(2, 8),
                    domain: 'api.example.com',
                    path: '/',
                    secure: true,
                    sameSite: 'Lax',
                  });
                  reloadCookies();
                }}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
              >
                + Insert Sample Cookie
              </button>
            </div>
          ) : (
            Object.entries(domainGroups).map(([domain, groupCookies]) => (
              <div key={domain} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                {/* Domain Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200 font-mono">{domain}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {groupCookies.length} {groupCookies.length === 1 ? 'cookie' : 'cookies'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const headerStr = groupCookies.map((c) => `${c.name}=${c.value}`).join('; ');
                        handleCopy(`domain_${domain}`, headerStr);
                      }}
                      className="px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-800/80 flex items-center space-x-1 transition-colors"
                      title="Copy full Cookie header"
                    >
                      {copiedId === `domain_${domain}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Header</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete all cookies for ${domain}?`)) {
                          clearCookiesForDomain(domain);
                          reloadCookies();
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                      title="Clear domain cookies"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cookies List */}
                <div className="divide-y divide-slate-800/60 font-mono text-xs">
                  {groupCookies.map((c) => (
                    <div key={c.id} className="p-3.5 hover:bg-slate-900/30 transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-bold text-amber-400 text-xs">{c.name}</span>
                            <span className="text-slate-600">=</span>
                            <span className="text-slate-200 font-mono break-all text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {c.value}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2 flex-wrap gap-y-1 font-sans">
                            <span className="flex items-center space-x-1">
                              <span className="text-slate-500">Path:</span>
                              <span className="font-mono text-slate-300">{c.path}</span>
                            </span>

                            {c.expires && (
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-500">Expires:</span>
                                <span className="font-mono text-slate-300 truncate max-w-xs">{c.expires}</span>
                              </span>
                            )}

                            {c.httpOnly && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                                HttpOnly
                              </span>
                            )}

                            {c.secure && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center space-x-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Secure</span>
                              </span>
                            )}

                            {c.sameSite && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                                SameSite: {c.sameSite}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                            title="Edit cookie"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(c.id, `${c.name}=${c.value}`)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                            title="Copy key=value"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteCookie(c.id);
                              reloadCookies();
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                            title="Delete cookie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isAutoEnabled ? 'Auto-injection active for matching hosts & paths' : 'Automatic Cookie Jar is paused'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
