import React, { useState, useMemo, useEffect } from 'react';
import {
  SchemaNode,
  SchemaType,
  inferJsonSchema,
  computeSchemaStats,
  generateDraft7JsonSchema,
  generateTypeScriptTypes,
} from '../utils/jsonSchemaGenerator';
import { highlightJson, highlightJs } from '../utils/syntaxHighlighter';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Copy,
  Check,
  Download,
  Code2,
  FileCode,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Braces,
  Hash,
  Binary,
  Calendar,
  Mail,
  Link,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';

interface JsonSchemaTreeViewerProps {
  responseBody: string;
  isDarkMode?: boolean;
}

export const JsonSchemaTreeViewer: React.FC<JsonSchemaTreeViewerProps> = ({
  responseBody,
  isDarkMode = true,
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'schema' | 'typescript'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  // 1. Parse JSON and Infer Schema
  const { parsedJson, parseError, schemaRoot, schemaStats } = useMemo(() => {
    if (!responseBody || !responseBody.trim()) {
      return { parsedJson: null, parseError: 'Response body is empty', schemaRoot: null, schemaStats: null };
    }
    try {
      const data = JSON.parse(responseBody);
      const schema = inferJsonSchema(data);
      const stats = computeSchemaStats(schema);
      return { parsedJson: data, parseError: null, schemaRoot: schema, schemaStats: stats };
    } catch (e: any) {
      return {
        parsedJson: null,
        parseError: e?.message || 'Invalid JSON format in response body',
        schemaRoot: null,
        schemaStats: null,
      };
    }
  }, [responseBody]);

  // Default expand all first 2 levels on schema load
  useEffect(() => {
    if (!schemaRoot) return;
    const initialExpanded: Record<string, boolean> = {};

    function collectPaths(node: SchemaNode, depth: number) {
      if (depth <= 2) {
        initialExpanded[node.path] = true;
      }
      if (node.properties) {
        Object.values(node.properties).forEach((child) => collectPaths(child, depth + 1));
      }
      if (node.items) {
        collectPaths(node.items, depth + 1);
      }
    }

    collectPaths(schemaRoot, 1);
    setExpandedPaths(initialExpanded);
  }, [schemaRoot]);

  // 2. Compute Formatted JSON Schema & TypeScript Code
  const { jsonSchemaText, tsCodeText } = useMemo(() => {
    if (!schemaRoot) return { jsonSchemaText: '', tsCodeText: '' };
    const draft7 = generateDraft7JsonSchema(schemaRoot, 'ApiResponseSchema');
    const tsCode = generateTypeScriptTypes(schemaRoot, 'ApiResponse');
    return {
      jsonSchemaText: JSON.stringify(draft7, null, 2),
      tsCodeText: tsCode,
    };
  }, [schemaRoot]);

  // Toggle node expansion
  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Expand all nodes
  const expandAll = () => {
    if (!schemaRoot) return;
    const allExpanded: Record<string, boolean> = {};
    function collect(node: SchemaNode) {
      allExpanded[node.path] = true;
      if (node.properties) Object.values(node.properties).forEach(collect);
      if (node.items) collect(node.items);
    }
    collect(schemaRoot);
    setExpandedPaths(allExpanded);
  };

  // Collapse all nodes
  const collapseAll = () => {
    setExpandedPaths({});
  };

  // Copy property path
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  // Copy View Content (Schema or TS)
  const handleCopyViewContent = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContent(label);
    setTimeout(() => setCopiedContent(null), 2000);
  };

  // Download View Content
  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Type badge styling
  const getTypeBadge = (type: SchemaType, format?: string) => {
    switch (type) {
      case 'string':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'integer':
      case 'number':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'boolean':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'object':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'array':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'null':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  // Format icon helper
  const getFormatIcon = (format?: string) => {
    if (!format) return null;
    switch (format) {
      case 'date-time':
      case 'date':
      case 'time':
        return <Calendar className="w-3 h-3 text-cyan-400" />;
      case 'email':
        return <Mail className="w-3 h-3 text-cyan-400" />;
      case 'uri':
        return <Link className="w-3 h-3 text-cyan-400" />;
      case 'uuid':
      case 'ipv4':
        return <Hash className="w-3 h-3 text-cyan-400" />;
      default:
        return null;
    }
  };

  if (parseError || !schemaRoot) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/60 select-none">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>
        <h4 className="font-bold text-sm text-slate-200">Cannot Generate JSON Schema</h4>
        <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
          {parseError || 'The current response payload is not formatted in valid JSON.'}
        </p>
        <p className="text-[11px] text-slate-500 mt-2 font-mono">
          Ensure the target endpoint returns a JSON payload (`application/json`) to inspect its structure.
        </p>
      </div>
    );
  }

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: SchemaNode, depth: number = 0): React.ReactNode => {
    const hasChildren = (node.properties && Object.keys(node.properties).length > 0) || (node.items && node.type === 'array');
    const isExpanded = !!expandedPaths[node.path];

    const matchesSearch =
      !searchTerm ||
      (node.key && node.key.toLowerCase().includes(searchTerm.toLowerCase())) ||
      node.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof node.type === 'string' && node.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (node.format && node.format.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (node.sampleValue !== undefined && String(node.sampleValue).toLowerCase().includes(searchTerm.toLowerCase()));

    // Format sample preview
    let samplePreview = '';
    if (node.sampleValue !== undefined && node.type !== 'object' && node.type !== 'array') {
      samplePreview = typeof node.sampleValue === 'string' ? `"${node.sampleValue}"` : String(node.sampleValue);
      if (samplePreview.length > 50) {
        samplePreview = samplePreview.substring(0, 47) + '...';
      }
    }

    return (
      <div key={node.path} className="font-mono text-xs select-text">
        {/* Row Element */}
        <div
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-colors group ${
            matchesSearch && searchTerm ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-slate-900/70'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 20)}px` }}
        >
          <div className="flex items-center space-x-2 overflow-hidden min-w-0 pr-2">
            {/* Expand / Collapse Chevron */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.path)}
                className="p-0.5 text-slate-400 hover:text-emerald-400 rounded transition-colors cursor-pointer shrink-0"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 inline-block shrink-0" />
            )}

            {/* Property Key Name */}
            <span
              className={`font-semibold truncate ${
                node.key === '[item]'
                  ? 'text-indigo-300 italic'
                  : depth === 0
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-200'
              }`}
            >
              {node.key || 'root'}
            </span>

            {/* Required / Optional Tag */}
            {depth > 0 && node.key !== '[item]' && (
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                  node.required !== false
                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                    : 'text-slate-500 bg-slate-800/80'
                }`}
                title={node.required !== false ? 'Required property' : 'Optional / Nullable property'}
              >
                {node.required !== false ? 'req' : 'opt'}
              </span>
            )}

            {/* Colon */}
            <span className="text-slate-600 shrink-0">:</span>

            {/* Type Badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getTypeBadge(
                node.type,
                node.format
              )}`}
            >
              {node.type}
              {node.nullable ? ' | null' : ''}
            </span>

            {/* Format Badge (if detected) */}
            {node.format && (
              <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shrink-0">
                {getFormatIcon(node.format)}
                <span>{node.format}</span>
              </span>
            )}

            {/* Structure Summary (property count or item count) */}
            {node.type === 'object' && node.properties && (
              <span className="text-[10px] text-slate-500 font-normal shrink-0">
                {`{ ${Object.keys(node.properties).length} props }`}
              </span>
            )}

            {node.type === 'array' && (
              <span className="text-[10px] text-indigo-400/80 font-normal shrink-0">
                {`[ ${node.itemCount !== undefined ? node.itemCount : 0} items ]`}
              </span>
            )}

            {/* Sample Value Preview */}
            {samplePreview && (
              <span className="text-[11px] text-slate-400 truncate opacity-90 hidden sm:inline ml-1 font-sans">
                = <span className="font-mono text-emerald-300/90">{samplePreview}</span>
              </span>
            )}
          </div>

          {/* Quick Action: Copy Path */}
          <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleCopyPath(node.path)}
              className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center space-x-1 cursor-pointer transition-colors"
              title={`Copy Path (${node.path})`}
            >
              {copiedPath === node.path ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Path</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Children (Properties / Array Items) */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-800/80 ml-4 pl-1 space-y-0.5 my-0.5">
            {node.type === 'object' && node.properties && (
              Object.values(node.properties).map((child) => renderTreeNode(child, depth + 1))
            )}
            {node.type === 'array' && node.items && (
              renderTreeNode(node.items, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      {/* Top Toolbar Header */}
      <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Schema Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('schema')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'schema'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Braces className="w-3.5 h-3.5" />
            <span>JSON Schema</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('typescript')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'typescript'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>TypeScript</span>
          </button>
        </div>

        {/* Middle/Right: Controls */}
        <div className="flex items-center space-x-2">
          {viewMode === 'tree' && (
            <>
              {/* Search Filter Input */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter fields, types..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Expand / Collapse All */}
              <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={expandAll}
                  className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Expand All Nodes"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Collapse All Nodes"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Action: Copy View Payload */}
          {viewMode === 'schema' && (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => handleCopyViewContent(jsonSchemaText, 'schema')}
                className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-medium transition-colors cursor-pointer"
              >
                {copiedContent === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedContent === 'schema' ? 'Copied' : 'Copy Schema'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(jsonSchemaText, 'response_schema.json', 'application/json')}
                className="flex items-center space-x-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .json</span>
              </button>
            </div>
          )}

          {viewMode === 'typescript' && (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => handleCopyViewContent(tsCodeText, 'typescript')}
                className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-medium transition-colors cursor-pointer"
              >
                {copiedContent === 'typescript' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedContent === 'typescript' ? 'Copied' : 'Copy TypeScript'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(tsCodeText, 'response_types.d.ts', 'text/typescript')}
                className="flex items-center space-x-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .d.ts</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schema Statistics Summary Strip */}
      {schemaStats && (
        <div className="px-3.5 py-2 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
          <div className="flex items-center space-x-3 overflow-x-auto text-[11px] font-mono">
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">Root:</span>
              <span className="text-emerald-400 font-bold uppercase">{schemaStats.rootType}</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">Total Fields:</span>
              <span className="text-slate-200 font-bold">{schemaStats.totalFields}</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">Max Depth:</span>
              <span className="text-slate-200 font-bold">{schemaStats.maxDepth}</span>
            </span>
            {schemaStats.typeCounts.string > 0 && (
              <span className="text-emerald-400/80">{schemaStats.typeCounts.string} strings</span>
            )}
            {schemaStats.typeCounts.number + schemaStats.typeCounts.integer > 0 && (
              <span className="text-sky-400/80">{schemaStats.typeCounts.number + schemaStats.typeCounts.integer} numbers</span>
            )}
            {schemaStats.typeCounts.boolean > 0 && (
              <span className="text-amber-400/80">{schemaStats.typeCounts.boolean} bools</span>
            )}
            {schemaStats.typeCounts.array > 0 && (
              <span className="text-indigo-400/80">{schemaStats.typeCounts.array} arrays</span>
            )}
            {schemaStats.typeCounts.object > 0 && (
              <span className="text-purple-400/80">{schemaStats.typeCounts.object} objects</span>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 select-text">
        {viewMode === 'tree' && (
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl space-y-1">
            {renderTreeNode(schemaRoot, 0)}
          </div>
        )}

        {viewMode === 'schema' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-slate-300">Standard Draft-07 JSON Schema Specification:</span>
              <span className="text-[11px] font-mono text-slate-500">http://json-schema.org/draft-07/schema#</span>
            </div>
            <pre className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-text">
              <code>{highlightJson(jsonSchemaText)}</code>
            </pre>
          </div>
        )}

        {viewMode === 'typescript' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-slate-300">Generated TypeScript Type Definitions:</span>
              <span className="text-[11px] font-mono text-emerald-400">Strict TypeScript 5.x</span>
            </div>
            <pre className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-text">
              <code>{highlightJs(tsCodeText)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
