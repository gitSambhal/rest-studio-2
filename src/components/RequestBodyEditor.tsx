import React, { useRef, useState } from 'react';
import { RequestBody, FormDataItem, KeyValuePair, EnvVariable } from '../types';
import { AutocompleteInput } from './AutocompleteInput';
import { VarBadge } from './VarBadge';
import { smartFormatJson, validateJsonSyntax } from '../utils/syntaxHighlighter';
import { resolveEnvVariables, ScopeContext } from '../utils/envUtils';
import {
  Upload,
  File as FileIcon,
  Trash2,
  Plus,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Variable,
  Code2,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
} from 'lucide-react';

interface RequestBodyEditorProps {
  body: RequestBody;
  onUpdateBody: (updated: RequestBody) => void;
  headers: KeyValuePair[];
  onUpdateHeaders: (headers: KeyValuePair[]) => void;
  scopeCtx?: ScopeContext;
  envVariables?: EnvVariable[];
  fileVariables?: Record<string, string>;
}

export const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
  body,
  onUpdateBody,
  headers,
  onUpdateHeaders,
  scopeCtx,
  envVariables = [],
  fileVariables = {},
}) => {
  const binaryFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingBinary, setIsDraggingBinary] = useState<boolean>(false);
  const [copiedBinary, setCopiedBinary] = useState<boolean>(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileCategoryIcon = (mimeType?: string) => {
    if (!mimeType) return <FileIcon className="w-5 h-5 text-emerald-400" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-amber-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed') || mimeType.includes('archive')) {
      return <FileArchive className="w-5 h-5 text-blue-400" />;
    }
    return <FileText className="w-5 h-5 text-emerald-400" />;
  };

  const handleModeChange = (newMode: RequestBody['mode']) => {
    const updatedHeaders = [...headers];
    const contentTypeIdx = updatedHeaders.findIndex((h) => h.key.toLowerCase() === 'content-type');

    let defaultContentType = '';
    if (newMode === 'json') defaultContentType = 'application/json';
    else if (newMode === 'x-www-form-urlencoded') defaultContentType = 'application/x-www-form-urlencoded';
    else if (newMode === 'raw') defaultContentType = 'text/plain';
    else if (newMode === 'form-data') {
      // For multipart, fetch sets boundary automatically; if user set explicit application/json, remove
      defaultContentType = '';
    } else if (newMode === 'binary' && body.binaryFile?.fileType) {
      defaultContentType = body.binaryFile.fileType;
    }

    if (defaultContentType) {
      if (contentTypeIdx >= 0) {
        updatedHeaders[contentTypeIdx] = {
          ...updatedHeaders[contentTypeIdx],
          value: defaultContentType,
          enabled: true,
        };
      } else {
        updatedHeaders.push({
          id: 'hdr_' + Math.random().toString(36).substring(2, 9),
          key: 'Content-Type',
          value: defaultContentType,
          enabled: true,
        });
      }
      onUpdateHeaders(updatedHeaders);
    } else if (newMode === 'form-data' && contentTypeIdx >= 0) {
      // Remove explicit content-type so fetch sets multipart boundary automatically
      const withoutCt = updatedHeaders.filter((_, i) => i !== contentTypeIdx);
      onUpdateHeaders(withoutCt);
    }

    onUpdateBody({
      ...body,
      mode: newMode,
    });
  };

  // Binary File upload processor
  const processBinaryFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      const binaryFile = {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileData,
      };

      onUpdateBody({
        ...body,
        binaryFile,
      });

      // Update content-type header if present or add
      const updatedHeaders = [...headers];
      const ctIdx = updatedHeaders.findIndex((h) => h.key.toLowerCase() === 'content-type');
      if (file.type) {
        if (ctIdx >= 0) {
          updatedHeaders[ctIdx] = { ...updatedHeaders[ctIdx], value: file.type };
          onUpdateHeaders(updatedHeaders);
        } else {
          updatedHeaders.push({
            id: 'hdr_' + Math.random().toString(36).substring(2, 9),
            key: 'Content-Type',
            value: file.type,
            enabled: true,
          });
          onUpdateHeaders(updatedHeaders);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBinaryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processBinaryFile(file);
  };

  const handleClearBinaryFile = () => {
    onUpdateBody({
      ...body,
      binaryFile: undefined,
    });
    if (binaryFileInputRef.current) {
      binaryFileInputRef.current.value = '';
    }
  };

  const handleDownloadBinaryFile = () => {
    if (!body.binaryFile?.fileData) return;
    const a = document.createElement('a');
    a.href = body.binaryFile.fileData;
    a.download = body.binaryFile.fileName || 'binary_payload.bin';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCopyBinaryBase64 = () => {
    if (!body.binaryFile?.fileData) return;
    const base64 = body.binaryFile.fileData.includes(',')
      ? body.binaryFile.fileData.split(',')[1]
      : body.binaryFile.fileData;
    navigator.clipboard.writeText(base64);
    setCopiedBinary(true);
    setTimeout(() => setCopiedBinary(false), 1800);
  };

  // FormData handlers
  const formDataItems: FormDataItem[] = body.formDataItems || [];

  const handleAddFormDataItem = (type: 'text' | 'file' = 'text') => {
    const newItem: FormDataItem = {
      id: 'fd_' + Math.random().toString(36).substring(2, 9),
      key: '',
      type,
      value: '',
      enabled: true,
    };
    onUpdateBody({
      ...body,
      formDataItems: [...formDataItems, newItem],
    });
  };

  const handleUpdateFormDataItem = (id: string, patch: Partial<FormDataItem>) => {
    const updated = formDataItems.map((item) => (item.id === id ? { ...item, ...patch } : item));
    onUpdateBody({
      ...body,
      formDataItems: updated,
    });
  };

  const handleDeleteFormDataItem = (id: string) => {
    onUpdateBody({
      ...body,
      formDataItems: formDataItems.filter((item) => item.id !== id),
    });
  };

  const handleClearAllFormDataItems = () => {
    if (confirm('Clear all form-data fields?')) {
      onUpdateBody({
        ...body,
        formDataItems: [],
      });
    }
  };

  const handleInsertSampleFormData = () => {
    const sampleItems: FormDataItem[] = [
      {
        id: 'fd_sample_1',
        key: 'username',
        type: 'text',
        value: 'john_developer',
        enabled: true,
      },
      {
        id: 'fd_sample_2',
        key: 'upload_scope',
        type: 'text',
        value: 'profile_media',
        enabled: true,
      },
      {
        id: 'fd_sample_3',
        key: 'avatar',
        type: 'file',
        value: '',
        enabled: true,
      },
    ];
    onUpdateBody({
      ...body,
      formDataItems: sampleItems,
    });
  };

  const handleFormDataFileUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      handleUpdateFormDataItem(id, {
        fileData: reader.result as string,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        value: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // URL-Encoded handlers
  const urlencodedItems: KeyValuePair[] = body.urlencodedItems || [];

  const handleAddUrlencodedItem = () => {
    const newItem: KeyValuePair = {
      id: 'ue_' + Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      enabled: true,
    };
    onUpdateBody({
      ...body,
      urlencodedItems: [...urlencodedItems, newItem],
    });
  };

  const handleUpdateUrlencodedItem = (id: string, patch: Partial<KeyValuePair>) => {
    const updated = urlencodedItems.map((item) => (item.id === id ? { ...item, ...patch } : item));
    onUpdateBody({
      ...body,
      urlencodedItems: updated,
    });
  };

  const handleDeleteUrlencodedItem = (id: string) => {
    onUpdateBody({
      ...body,
      urlencodedItems: urlencodedItems.filter((item) => item.id !== id),
    });
  };

  // FormData summaries
  const totalFormFields = formDataItems.length;
  const enabledFormFields = formDataItems.filter((i) => i.enabled).length;
  const attachedFilesCount = formDataItems.filter((i) => i.type === 'file' && i.fileData).length;

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-300">Body Type:</span>
          {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary'] as const).map((mode) => (
            <label key={mode} className="flex items-center space-x-1.5 cursor-pointer font-mono">
              <input
                type="radio"
                name="bodyModeSelector"
                checked={body.mode === mode}
                onChange={() => handleModeChange(mode)}
                className="text-emerald-500 focus:ring-0"
              />
              <span
                className={`uppercase text-xs ${
                  body.mode === mode ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'x-www-form-urlencoded' ? 'x-www-form' : mode}
              </span>
            </label>
          ))}
        </div>

        {body.mode === 'json' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const res = smartFormatJson(body.rawText, 2);
                if (res.error) {
                  alert(`JSON Formatting Error: ${res.error}`);
                } else {
                  onUpdateBody({ ...body, rawText: res.formatted });
                }
              }}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 px-2.5 py-1 rounded font-mono font-semibold transition-all cursor-pointer"
              title="Pretty-print JSON with 2 spaces"
            >
              Format JSON
            </button>

            <button
              type="button"
              onClick={() => {
                const res = smartFormatJson(body.rawText, 0);
                if (res.error) {
                  alert(`JSON Minification Error: ${res.error}`);
                } else {
                  onUpdateBody({ ...body, rawText: res.formatted });
                }
              }}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded font-mono transition-all cursor-pointer"
              title="Minify JSON into single-line string"
            >
              Minify
            </button>

            <button
              type="button"
              onClick={() => {
                const sample = `{\n  "name": "Jane Doe",\n  "email": "jane.doe@example.com",\n  "role": "admin",\n  "status": "active"\n}`;
                onUpdateBody({ ...body, rawText: sample });
              }}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded font-mono cursor-pointer"
            >
              Insert Sample
            </button>

            {body.rawText.trim().length > 0 && (() => {
              const ctxToUseForVal = scopeCtx || { projectVariables: envVariables, fileVariables };
              const resolvedForVal = resolveEnvVariables(body.rawText, ctxToUseForVal).resolved;
              const status = validateJsonSyntax(resolvedForVal);
              const hasVars = /\{\{[a-zA-Z0-9_$.-]+\}\}/.test(body.rawText);

              if (status.isValid) {
                return (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{hasVars ? 'Valid JSON (with variables)' : 'Valid JSON'}</span>
                  </span>
                );
              }
              return (
                <span
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center space-x-1 max-w-xs truncate"
                  title={status.error}
                >
                  <XCircle className="w-3 h-3 text-rose-400" />
                  <span className="truncate">Invalid JSON: {status.error}</span>
                </span>
              );
            })()}
          </div>
        )}
      </div>

      {/* BODY CONTENT DEPENDING ON MODE */}

      {/* 1. NONE */}
      {body.mode === 'none' && (
        <div className="py-8 text-center text-slate-500 text-xs font-mono border border-slate-800/80 rounded-xl bg-slate-900/30">
          This request does not include a body payload.
        </div>
      )}

      {/* 2. BINARY FILE UPLOAD */}
      {body.mode === 'binary' && (
        <div className="space-y-3">
          <input
            type="file"
            ref={binaryFileInputRef}
            onChange={handleBinaryFileUpload}
            className="hidden"
            id="binary-file-input"
          />

          {!body.binaryFile?.fileData ? (
            <div
              onClick={() => binaryFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingBinary(true);
              }}
              onDragLeave={() => setIsDraggingBinary(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingBinary(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processBinaryFile(file);
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-900/30 group ${
                isDraggingBinary
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[0.99]'
                  : 'border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900/50'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 mb-1">
                {isDraggingBinary ? 'Drop file to upload' : 'Click or drop binary file here'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload raw images, PDF documents, audio, zip archives, or binary data streams to transmit directly in the HTTP body payload.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {getFileCategoryIcon(body.binaryFile.fileType)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100 font-mono flex items-center space-x-2">
                      <span>{body.binaryFile.fileName || 'binary_payload.bin'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-bold">
                        Binary Ready
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 font-mono">
                      <span>MIME: {body.binaryFile.fileType || 'application/octet-stream'}</span>
                      <span>•</span>
                      <span>Size: {formatFileSize(body.binaryFile.fileSize)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyBinaryBase64}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Copy Base64 string"
                  >
                    {copiedBinary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Base64</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBinaryFile}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Download binary file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => binaryFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBinaryFile}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image preview if image */}
              {body.binaryFile.fileType?.startsWith('image/') && body.binaryFile.fileData && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-4">
                  <img
                    src={body.binaryFile.fileData}
                    alt="Binary Preview"
                    className="max-h-36 max-w-xs rounded-lg border border-slate-800 object-contain bg-slate-950 p-1.5"
                  />
                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Image Preview</p>
                    <p className="text-[11px] text-slate-500">
                      Transmitted as raw image bytes with <code className="text-emerald-400">{body.binaryFile.fileType}</code> Content-Type.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. MULTIPART / FORM-DATA */}
      {body.mode === 'form-data' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-300">Multipart Form-Data Fields</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {enabledFormFields}/{totalFormFields} active • {attachedFilesCount} {attachedFilesCount === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleInsertSampleFormData}
                className="px-2 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Sample Fields
              </button>
              {formDataItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFormDataItems}
                  className="px-2 py-1 rounded text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAddFormDataItem('text')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Text</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddFormDataItem('file')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Paperclip className="w-3 h-3" />
                <span>Add File</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800">
            {formDataItems.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-slate-500 text-xs font-mono">
                <p>No form-data fields added yet.</p>
                <p className="text-slate-600 font-sans">
                  Click &quot;Add Text&quot; or &quot;Add File&quot; to construct multipart requests.
                </p>
              </div>
            ) : (
              formDataItems.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center gap-2.5 text-xs font-mono hover:bg-slate-900/30 transition-colors">
                  {/* Enable checkbox */}
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => handleUpdateFormDataItem(item.id, { enabled: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-0 shrink-0 cursor-pointer"
                    title="Enable/Disable field"
                  />

                  {/* Key */}
                  <input
                    type="text"
                    placeholder="Field Key (e.g. file, avatar, email)"
                    value={item.key}
                    onChange={(e) => handleUpdateFormDataItem(item.id, { key: e.target.value })}
                    className="w-1/3 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />

                  {/* Type Selector */}
                  <select
                    value={item.type}
                    onChange={(e) =>
                      handleUpdateFormDataItem(item.id, {
                        type: e.target.value as 'text' | 'file',
                        value: '',
                        fileData: undefined,
                        fileName: undefined,
                        fileSize: undefined,
                        fileType: undefined,
                      })
                    }
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/50 shrink-0"
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>

                  {/* Value / File Picker */}
                  <div className="flex-1 min-w-0">
                    {item.type === 'text' ? (
                      <input
                        type="text"
                        placeholder="Value (supports {{variables}})"
                        value={item.value}
                        onChange={(e) => handleUpdateFormDataItem(item.id, { value: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <label className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer flex items-center space-x-1.5 shrink-0 transition-colors">
                          <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{item.fileName ? 'Change File' : 'Select File'}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFormDataFileUpload(item.id, f);
                            }}
                          />
                        </label>
                        {item.fileName ? (
                          <div className="flex items-center space-x-2 truncate text-xs text-slate-300 min-w-0">
                            {item.fileType?.startsWith('image/') && item.fileData && (
                              <img
                                src={item.fileData}
                                alt="Thumb"
                                className="w-5 h-5 rounded object-cover border border-slate-700 shrink-0"
                              />
                            )}
                            <span className="font-semibold text-emerald-400 truncate">{item.fileName}</span>
                            {item.fileSize !== undefined && (
                              <span className="text-slate-500 shrink-0 font-mono text-[11px]">
                                ({formatFileSize(item.fileSize)})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateFormDataItem(item.id, {
                                  fileData: undefined,
                                  fileName: undefined,
                                  fileSize: undefined,
                                  fileType: undefined,
                                  value: '',
                                })
                              }
                              className="text-slate-500 hover:text-rose-400 ml-1 text-xs"
                              title="Clear file"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-xs">No file chosen</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteFormDataItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. X-WWW-FORM-URLENCODED */}
      {body.mode === 'x-www-form-urlencoded' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>URL Encoded Key-Value Pairs</span>
            <button
              type="button"
              onClick={handleAddUrlencodedItem}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Key-Value</span>
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800">
            {urlencodedItems.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                No encoded key-values yet. Click &quot;Add Key-Value&quot; above.
              </div>
            ) : (
              urlencodedItems.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center gap-2.5 text-xs font-mono hover:bg-slate-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => handleUpdateUrlencodedItem(item.id, { enabled: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-0 shrink-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="Key"
                    value={item.key}
                    onChange={(e) => handleUpdateUrlencodedItem(item.id, { key: e.target.value })}
                    className="w-1/3 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Value (supports {{variables}})"
                    value={item.value}
                    onChange={(e) => handleUpdateUrlencodedItem(item.id, { value: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteUrlencodedItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. JSON / RAW TEXT */}
      {(body.mode === 'json' || body.mode === 'raw') && (() => {
        const bodyVarKeys = Array.from(
          new Set(
            Array.from(body.rawText.matchAll(/\{\{([a-zA-Z0-9_$.-]+)\}\}/g)).map(
              (m) => m[1]
            )
          )
        );

        return (
          <div className="space-y-3">
            {bodyVarKeys.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-sans font-semibold text-slate-300 shrink-0 flex items-center space-x-1">
                  <Variable className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Body variables detected:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {bodyVarKeys.map((vk) => (
                    <VarBadge
                      key={vk}
                      varKey={vk}
                      scopeCtx={scopeCtx}
                      envVariables={envVariables}
                      fileVariables={fileVariables}
                    />
                  ))}
                </div>
              </div>
            )}

            <AutocompleteInput
              isMultiline={true}
              rows={10}
              value={body.rawText}
              scopeCtx={scopeCtx}
              envVariables={envVariables}
              fileVariables={fileVariables}
              onChange={(val) => onUpdateBody({ ...body, rawText: val })}
              placeholder={
                body.mode === 'json'
                  ? 'Enter request body JSON... (Type {{ for environment variable autocomplete)'
                  : 'Enter raw request text... (Type {{ for environment variable autocomplete)'
              }
            />

            <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
              <span>
                Autocomplete available: Type <code className="text-emerald-400">&#123;&#123;</code> anywhere in the body text
              </span>
              <span>{body.rawText.length} characters</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
