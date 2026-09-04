/**
 * RestStudio - Offline-First REST API Client & Workspace
 * Created by Suhail Akhtar (https://suhail.top)
 */

import React, { useState, useMemo } from 'react';
import { Project, RestFile, RestRequest } from '../types';
import { generateCodeSnippet, CodeSnippetLanguage } from '../utils/codeSnippetGenerator';
import { generateHtmlDocs, generateMarkdownDocs } from '../utils/docExporter';
import {
  BookOpen,
  X,
  Search,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  Printer,
  Globe,
  Play,
  Send,
  Code2,
  Key,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';

interface ApiDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activeFileId?: string | null;
  activeRequestId?: string | null;
  onSelectRequest?: (fileId: string, requestId: string) => void;
  isDarkMode?: boolean;
}

export const ApiDocumentationModal: React.FC<ApiDocumentationModalProps> = ({
  isOpen,
  onClose,
  project,
  activeFileId,
  activeRequestId,
  onSelectRequest,
  isDarkMode = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [docTitle, setDocTitle] = useState(project.name || 'API Reference Documentation');
  const [docSubtitle, setDocSubtitle] = useState(project.description || 'RestStudio Generated Interactive REST Specification');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com/v1');
  const [apiVersion, setApiVersion] = useState('v1.0.0');
  const [selectedLanguage, setSelectedLanguage] = useState<CodeSnippetLanguage>('curl');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | 'all'>('all');

  // Filter requests based on search query and file filter
  const filteredFiles = useMemo(() => {
    return (project.files || [])
      .filter((f) => selectedFileFilter === 'all' || f.id === selectedFileFilter)
      .map((file) => {
        const matchingRequests = (file.requests || []).filter((req) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            req.name.toLowerCase().includes(q) ||
            req.url.toLowerCase().includes(q) ||
            req.method.toLowerCase().includes(q) ||
            (req.description && req.description.toLowerCase().includes(q))
          );
        });
        return { ...file, requests: matchingRequests };
      })
      .filter((file) => file.requests.length > 0);
  }, [project.files, selectedFileFilter, searchQuery]);

  const totalRequestsCount = useMemo(() => {
    return (project.files || []).reduce((acc, f) => acc + (f.requests?.length || 0), 0);
  }, [project.files]);

  if (!isOpen) return null;

  const handleCopySnippet = (reqId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(reqId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownDocs(project, {
      title: docTitle,
      subtitle: docSubtitle,
      baseUrl,
      version: apiVersion,
    });
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleExportHtml = () => {
    const html = generateHtmlDocs(project, {
      title: docTitle,
      subtitle: docSubtitle,
      baseUrl,
      version: apiVersion,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(docTitle)}-api-docs.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const md = generateMarkdownDocs(project, {
      title: docTitle,
      subtitle: docSubtitle,
      baseUrl,
      version: apiVersion,
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(docTitle)}-api-docs.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-7xl h-[92vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl transition-colors ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header Toolbar */}
        <div className={`px-6 py-4 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className={`font-bold text-base bg-transparent border-b border-dashed border-transparent hover:border-slate-500 focus:border-emerald-400 focus:outline-none px-1 transition-colors ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                  placeholder="API Title"
                />
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Interactive Docs
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {totalRequestsCount} Endpoints &bull; Auto-Generated Documentation
              </p>
            </div>
          </div>

          {/* Quick Controls & Export Options */}
          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-56 min-w-[140px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search endpoints..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-emerald-400 ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>

            {/* Copy MD */}
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Copy Markdown Documentation"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedMd ? 'Copied' : 'Copy MD'}</span>
            </button>

            {/* Download MD */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-sky-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-sky-600 hover:bg-slate-100'
              }`}
              title="Export Markdown File"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>.MD</span>
            </button>

            {/* Download HTML */}
            <button
              type="button"
              onClick={handleExportHtml}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Export Standalone Web HTML Page"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export HTML</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Print Documentation / Save PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Table of Contents Navigation Sidebar */}
          <aside
            className={`w-72 shrink-0 border-r flex flex-col p-4 space-y-4 overflow-y-auto hidden md:flex ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            {/* Metadata Config Box */}
            <div className={`p-3 rounded-xl border space-y-2 text-xs font-mono ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className={`w-full mt-1 px-2 py-1 rounded border text-xs focus:outline-none focus:border-emerald-400 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-700'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Version</label>
                  <input
                    type="text"
                    value={apiVersion}
                    onChange={(e) => setApiVersion(e.target.value)}
                    className={`w-full mt-0.5 px-2 py-0.5 rounded border text-xs focus:outline-none focus:border-emerald-400 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Collection Filter */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Collections</div>
              <select
                value={selectedFileFilter}
                onChange={(e) => setSelectedFileFilter(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Collections ({totalRequestsCount})</option>
                {(project.files || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name} ({(f.requests || []).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Endpoints Table of Contents */}
            <div className="flex-1 space-y-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 px-1">
                    <span className="text-amber-400">📁</span>
                    <span className="truncate">{file.name}</span>
                  </div>

                  <div className="space-y-1 pl-2">
                    {file.requests.map((req) => (
                      <a
                        key={req.id}
                        href={`#doc-req-${req.id}`}
                        className={`flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors group ${
                          activeRequestId === req.id
                            ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-emerald-50 text-emerald-700 font-semibold'
                            : isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${getMethodBadgeClass(req.method)}`}>
                          {req.method}
                        </span>
                        <span className="truncate">{req.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}

              {filteredFiles.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No endpoints match "{searchQuery}"
                </div>
              )}
            </div>
          </aside>

          {/* Main Interactive Documentation Feed */}
          <main className="flex-1 p-6 space-y-10 overflow-y-auto min-w-0">
            {/* Documentation Hero Header */}
            <div className={`p-6 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                  {apiVersion}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Base Endpoint: <code className="text-emerald-400 font-semibold">{baseUrl}</code>
                </span>
              </div>

              <input
                type="text"
                value={docSubtitle}
                onChange={(e) => setDocSubtitle(e.target.value)}
                className={`w-full text-xs bg-transparent border-b border-dashed border-transparent hover:border-slate-500 focus:border-emerald-400 focus:outline-none py-1 transition-colors ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
                placeholder="API Subtitle or overview description"
              />
            </div>

            {/* Language Code Snippet Selector */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold tracking-tight">Endpoint Reference</h2>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-400 hidden sm:inline">Code Snippets:</span>
                <div className={`flex items-center p-0.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
                }`}>
                  {(['curl', 'fetch', 'axios', 'python', 'nodejs', 'go', 'rust'] as CodeSnippetLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                        selectedLanguage === lang
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'fetch' ? 'JS' : lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Endpoint Documentation Cards */}
            <div className="space-y-8">
              {filteredFiles.map((file) => (
                <section key={file.id} className="space-y-6">
                  {/* File / Collection Header */}
                  <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2">
                    <span className="text-lg">📁</span>
                    <h2 className="text-lg font-bold text-slate-100">{file.name}</h2>
                    {file.description && (
                      <span className="text-xs text-slate-400 ml-2">&bull; {file.description}</span>
                    )}
                  </div>

                  {/* Requests inside Collection */}
                  <div className="space-y-6">
                    {file.requests.map((req) => {
                      const snippetCode = generateCodeSnippet(selectedLanguage, req);
                      const activeHeaders = (req.headers || []).filter((h) => h.enabled && h.key);
                      const activeParams = (req.queryParams || []).filter((p) => p.enabled && p.key);

                      return (
                        <article
                          key={req.id}
                          id={`doc-req-${req.id}`}
                          className={`p-6 rounded-2xl border space-y-5 transition-all ${
                            isDarkMode
                              ? 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800/80 shadow-xl'
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          {/* Endpoint Title & Try in Workspace CTA */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${getMethodBadgeClass(req.method)}`}>
                                {req.method}
                              </span>
                              <h3 className="text-base font-bold text-slate-100">{req.name}</h3>
                            </div>

                            {onSelectRequest && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectRequest(file.id, req.id);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Try in Workspace</span>
                              </button>
                            )}
                          </div>

                          {/* Full URL Banner */}
                          <div className={`px-4 py-2.5 rounded-xl border font-mono text-xs flex items-center justify-between gap-3 overflow-x-auto ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-500">{req.method}</span>
                              <span className="text-emerald-400 font-semibold">{req.url || '/'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(req.url || '')}
                              className="text-[10px] text-slate-400 hover:text-slate-200 font-sans cursor-pointer"
                              title="Copy Endpoint URL"
                            >
                              Copy URL
                            </button>
                          </div>

                          {/* Description */}
                          {req.description && (
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {req.description}
                            </p>
                          )}

                          {/* Request Parameters & Headers */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Headers */}
                            {activeHeaders.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                                  <Layers className="w-3 h-3 text-emerald-400" />
                                  <span>Headers ({activeHeaders.length})</span>
                                </h4>
                                <div className={`border rounded-xl overflow-hidden text-xs ${
                                  isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
                                }`}>
                                  <table className="w-full text-left font-mono">
                                    <thead className={`text-[10px] uppercase border-b ${
                                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'
                                    }`}>
                                      <tr>
                                        <th className="px-3 py-1.5">Header</th>
                                        <th className="px-3 py-1.5">Sample Value</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      {activeHeaders.map((h) => (
                                        <tr key={h.id}>
                                          <td className="px-3 py-1.5 text-emerald-400 font-semibold">{h.key}</td>
                                          <td className="px-3 py-1.5 text-slate-300 truncate max-w-[150px]">{h.value || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Query Params */}
                            {activeParams.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                                  <Globe className="w-3 h-3 text-sky-400" />
                                  <span>Query Parameters ({activeParams.length})</span>
                                </h4>
                                <div className={`border rounded-xl overflow-hidden text-xs ${
                                  isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
                                }`}>
                                  <table className="w-full text-left font-mono">
                                    <thead className={`text-[10px] uppercase border-b ${
                                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'
                                    }`}>
                                      <tr>
                                        <th className="px-3 py-1.5">Param</th>
                                        <th className="px-3 py-1.5">Sample Value</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      {activeParams.map((p) => (
                                        <tr key={p.id}>
                                          <td className="px-3 py-1.5 text-sky-400 font-semibold">{p.key}</td>
                                          <td className="px-3 py-1.5 text-slate-300 truncate max-w-[150px]">{p.value || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Request Body Payload */}
                          {req.body && req.body.mode === 'json' && req.body.rawText && (
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                                <Code2 className="w-3 h-3 text-amber-400" />
                                <span>Request Payload (JSON)</span>
                              </h4>
                              <pre className={`p-4 rounded-xl border text-xs font-mono overflow-x-auto ${
                                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-100'
                              }`}>
                                <code>{req.body.rawText}</code>
                              </pre>
                            </div>
                          )}

                          {/* Interactive Code Snippet Box */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                                <FileCode className="w-3 h-3 text-purple-400" />
                                <span>Example Request ({selectedLanguage})</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(req.id, snippetCode)}
                                className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                              >
                                {copiedCodeId === req.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedCodeId === req.id ? 'Copied Snippet' : 'Copy Code'}</span>
                              </button>
                            </div>

                            <pre className={`p-4 rounded-xl border text-xs font-mono overflow-x-auto ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-amber-300' : 'bg-slate-900 border-slate-800 text-amber-300'
                            }`}>
                              <code>{snippetCode}</code>
                            </pre>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>

        {/* Footer info bar */}
        <div className={`px-6 py-3 border-t text-xs font-mono flex items-center justify-between shrink-0 ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <div>
            Created by <a href="https://suhail.top" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">Suhail Akhtar</a> &bull; RestStudio API Docs
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Interactive Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function getMethodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'POST': return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
    case 'PUT': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'DELETE': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    case 'PATCH': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}
