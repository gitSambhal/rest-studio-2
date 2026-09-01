import React from 'react';
import { InlineThemeSelector } from './InlineThemeSelector';
import { UIThemeId } from '../utils/themeManager';
import {
  Send,
  Upload,
  Sparkles,
  Code2,
  Globe,
  Terminal,
  Zap,
  Key,
  Cpu,
  Layers,
  Laptop,
  Moon,
  Sun,
  ArrowRight,
  CheckCircle2,
  Play,
  Command,
  ShieldCheck,
  FileCode2,
  Copy,
} from 'lucide-react';

export interface OnboardingScreenProps {
  onCreateNewRequest: () => void;
  onOpenImportModal: () => void;
  onOpenQuickCurl?: () => void;
  onOpenQuickHelp?: () => void;
  onLaunchWorkspace?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentTheme?: UIThemeId;
  onSelectTheme?: (themeId: UIThemeId) => void;
  onSelectSampleRequest?: (sampleType: 'get_todo' | 'post_json' | 'auth' | 'github_zen') => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onCreateNewRequest,
  onOpenImportModal,
  onOpenQuickCurl,
  onOpenQuickHelp,
  onLaunchWorkspace,
  isDarkMode,
  onToggleDarkMode,
  currentTheme = 'dark',
  onSelectTheme,
  onSelectSampleRequest,
}) => {
  return (
    <div
      className={`min-h-screen w-full flex flex-col select-none overflow-y-auto transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Launching Header (Embedded) */}
      <header
        className={`w-full px-6 py-4 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-md ${
          isDarkMode
            ? 'bg-slate-950/80 border-slate-800/80'
            : 'bg-white/80 border-slate-200/80'
        }`}
      >
        <div className="flex items-center space-x-3">
          <img
            src="/icon.svg"
            alt="RestStudio"
            className="w-8 h-8 rounded-xl shrink-0 select-none pointer-events-none"
            draggable={false}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight">RestStudio</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                API Studio
              </span>
            </div>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              REST & HTTP Developer Environment
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onSelectTheme && (
            <InlineThemeSelector
              currentTheme={currentTheme}
              onSelectTheme={onSelectTheme}
              isDarkMode={isDarkMode}
              onToggleDarkMode={onToggleDarkMode}
            />
          )}

          {/* Quick Search Shortcut Badge */}
          <button
            type="button"
            onClick={onOpenQuickHelp}
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Open Quick Help & Search (Cmd + K)"
          >
            <Command className="w-3 h-3 text-emerald-400" />
            <span>K Search</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Toggle Light / Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Launch Workspace CTA Button */}
          <button
            type="button"
            onClick={onLaunchWorkspace || onCreateNewRequest}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition-all cursor-pointer group"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-12 pb-8 flex flex-col items-center text-center space-y-6">
        {/* Badge Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-medium shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Local-First REST & Microservice Testing</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Next-Gen REST & HTTP <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            Developer Studio
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p
          className={`text-sm sm:text-base max-w-2xl leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Design, test, debug, and automate REST APIs with zero setup. Full compatibility with Postman collections, cURL syntax, scoped environment variables, and pre-request JavaScript scripts.
        </p>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full pt-4">
          {/* Action 1: New Request */}
          <button
            type="button"
            onClick={onCreateNewRequest}
            className={`group p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
              isDarkMode
                ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-emerald-500/50 shadow-xl'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-500/50 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Action
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold group-hover:text-emerald-400 transition-colors">
                New Request
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Create a fresh HTTP request tab with headers, auth & payload editor.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-emerald-400 font-mono">
              <span>Create Request &rarr;</span>
            </div>
          </button>

          {/* Action 2: Import */}
          <button
            type="button"
            onClick={onOpenImportModal}
            className={`group p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
              isDarkMode
                ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-sky-500/50 shadow-xl'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-500/50 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Postman
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold group-hover:text-sky-400 transition-colors">
                Import Collection
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Import Postman v2.1 collections, OpenAPI specs, or workspace JSON.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-sky-400 font-mono">
              <span>Import Files &rarr;</span>
            </div>
          </button>

          {/* Action 3: Quick cURL */}
          <button
            type="button"
            onClick={onOpenQuickCurl || onOpenImportModal}
            className={`group p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
              isDarkMode
                ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-purple-500/50 shadow-xl'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-purple-500/50 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                cURL
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold group-hover:text-purple-400 transition-colors">
                Quick cURL
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Paste any terminal cURL command to convert into a structured request.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-purple-400 font-mono">
              <span>Paste cURL &rarr;</span>
            </div>
          </button>

          {/* Action 4: Desktop App */}
          <button
            type="button"
            onClick={onLaunchWorkspace || onCreateNewRequest}
            className={`group p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
              isDarkMode
                ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-amber-500/50 shadow-xl'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-500/50 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Laptop className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Native
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold group-hover:text-amber-400 transition-colors">
                Desktop Build
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Native binaries for macOS (Universal), Windows x64, and Linux.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-amber-400 font-mono">
              <span>View Desktop App &rarr;</span>
            </div>
          </button>
        </div>
      </div>

      {/* Instant API Starter Templates */}
      <div className="max-w-6xl w-full mx-auto px-6 py-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Instant Starter Templates</h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Click any sample below to immediately open and test it in the workspace
            </p>
          </div>
          <button
            type="button"
            onClick={onLaunchWorkspace || onCreateNewRequest}
            className="text-xs font-mono font-semibold text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Open Workspace Editor</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sample 1: GET Todo */}
          <div
            onClick={() => onSelectSampleRequest?.('get_todo')}
            className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
              isDarkMode
                ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/40'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-500/50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                GET
              </span>
              <span className="text-xs font-semibold truncate group-hover:text-emerald-400 transition-colors">
                GET Todo Item
              </span>
            </div>
            <p className={`text-[11px] font-mono mt-2 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              jsonplaceholder.typicode.com/todos/1
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>Sanity Test</span>
              <Play className="w-3 h-3 text-emerald-400 group-hover:scale-125 transition-transform" />
            </div>
          </div>

          {/* Sample 2: POST JSON */}
          <div
            onClick={() => onSelectSampleRequest?.('post_json')}
            className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
              isDarkMode
                ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-sky-500/40'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-500/50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                POST
              </span>
              <span className="text-xs font-semibold truncate group-hover:text-sky-400 transition-colors">
                POST JSON Payload
              </span>
            </div>
            <p className={`text-[11px] font-mono mt-2 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              jsonplaceholder.typicode.com/posts
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>JSON Body</span>
              <Play className="w-3 h-3 text-sky-400 group-hover:scale-125 transition-transform" />
            </div>
          </div>

          {/* Sample 3: Bearer Auth */}
          <div
            onClick={() => onSelectSampleRequest?.('auth')}
            className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
              isDarkMode
                ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-purple-500/40'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-purple-500/50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                AUTH
              </span>
              <span className="text-xs font-semibold truncate group-hover:text-purple-400 transition-colors">
                Bearer Token Auth
              </span>
            </div>
            <p className={`text-[11px] font-mono mt-2 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              httpbin.org/bearer
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>Header Token</span>
              <Play className="w-3 h-3 text-purple-400 group-hover:scale-125 transition-transform" />
            </div>
          </div>

          {/* Sample 4: GitHub Zen */}
          <div
            onClick={() => onSelectSampleRequest?.('github_zen')}
            className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
              isDarkMode
                ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-amber-500/40'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-500/50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                GET
              </span>
              <span className="text-xs font-semibold truncate group-hover:text-amber-400 transition-colors">
                GitHub Zen API
              </span>
            </div>
            <p className={`text-[11px] font-mono mt-2 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              api.github.com/zen
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>Plain Text</span>
              <Play className="w-3 h-3 text-amber-400 group-hover:scale-125 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Features Showcase */}
      <div className="max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Core Workspace Features</h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Built from the ground up for high productivity and zero latency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">Full HTTP Method Suite</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Support for GET, POST, PUT, DELETE, PATCH, HEAD, and OPTIONS. Easily customize headers, query parameters, form data, and JSON payloads with live syntax validation.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">Postman & cURL Import</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Seamlessly import Postman v2.1 collection exports, cURL commands, OpenAPI specs, or native <span className="font-mono text-sky-400">.rest</span> files in 1 click.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">3-Tier Environment Variable Scoping</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Scoped variable resolution pipeline across Global &rarr; Active Environment &rarr; Request variables with dynamic <span className="font-mono text-purple-400">{'{{baseUrl}}'}</span> template substitution.
            </p>
          </div>

          {/* Feature 4 */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">JavaScript Scripts & Test Suites</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Execute JavaScript pre-request script transformations and post-request test assertions. Verify response status codes, timing benchmarks, and JSON structure.
            </p>
          </div>

          {/* Feature 5 */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <FileCode2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">7 Production Code Snippet Generators</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Instantly export any request into clean production code for JavaScript <span className="font-mono text-rose-400">fetch</span>, <span className="font-mono text-rose-400">axios</span>, Python <span className="font-mono text-rose-400">requests</span>, Node.js, Go, Rust, and cURL.
            </p>
          </div>

          {/* Feature 6 */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">100% Offline & Native OS Speed</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Local storage auto-persisted, native macOS Cocoa clipboard support, zero cloud tracking, and ultra-lightweight memory usage.
            </p>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <div className="max-w-6xl w-full mx-auto px-6 py-6">
        <div
          className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-sm font-bold flex items-center justify-center md:justify-start space-x-2">
              <Command className="w-4 h-4 text-emerald-400" />
              <span>Keyboard Shortcuts Cheat Sheet</span>
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Work at full developer speed with native keyboard shortcuts
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto font-mono text-xs">
            <div
              className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center space-y-1 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-500">New Request</span>
              <span className="font-bold text-emerald-400">Cmd + N</span>
            </div>
            <div
              className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center space-y-1 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-500">Send Request</span>
              <span className="font-bold text-sky-400">Cmd + Enter</span>
            </div>
            <div
              className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center space-y-1 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-500">Quick cURL</span>
              <span className="font-bold text-purple-400">Cmd+Shift+C</span>
            </div>
            <div
              className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center space-y-1 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-500">Native Select All</span>
              <span className="font-bold text-amber-400">Cmd + A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <footer
        className={`w-full py-6 px-6 border-t mt-auto text-xs font-mono text-center flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDarkMode
            ? 'bg-slate-950 border-slate-800/80 text-slate-500'
            : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>RestStudio Desktop & Web v1.0.0</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Local Storage Auto-Saved</span>
          </span>
          <span>&bull;</span>
          <span className="flex items-center space-x-1">
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span>REST Client (.rest) Engine</span>
          </span>
        </div>

        <div>
          <button
            type="button"
            onClick={onLaunchWorkspace || onCreateNewRequest}
            className="text-emerald-400 hover:underline cursor-pointer font-semibold"
          >
            Launch Editor &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
};
