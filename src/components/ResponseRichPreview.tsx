import React, { useState, useRef, useEffect } from 'react';
import { ExecutionResponse } from '../types';
import {
  Image,
  FileText,
  Globe,
  Music,
  Video,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  Code2,
  Eye,
  Maximize2,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface ResponseRichPreviewProps {
  response: ExecutionResponse;
}

export const ResponseRichPreview: React.FC<ResponseRichPreviewProps> = ({ response }) => {
  const contentType = (response.contentType || response.headers?.['content-type'] || '').toLowerCase();
  const rawBody = response.body || '';
  const base64Body = response.base64Body;

  // Zoom & Display states for image preview
  const [zoom, setZoom] = useState(1);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [htmlViewMode, setHtmlViewMode] = useState<'rendered' | 'source'>('rendered');

  // Determine media category with strict HTML-first precedence
  const trimmed = rawBody.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  const isHtml =
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml+xml') ||
    lowerTrimmed.startsWith('<!doctype html') ||
    lowerTrimmed.startsWith('<html') ||
    (/<html[\s>]/i.test(rawBody) && /<\/html>/i.test(rawBody)) ||
    (/<body[\s>]/i.test(rawBody) && /<\/body>/i.test(rawBody)) ||
    (/<head[\s>]/i.test(rawBody) && /<\/head>/i.test(rawBody));

  const isSvg =
    !isHtml &&
    (contentType.includes('image/svg+xml') ||
      contentType.includes('image/svg') ||
      (contentType.includes('svg') && !contentType.includes('html')) ||
      lowerTrimmed.startsWith('<svg') ||
      (lowerTrimmed.startsWith('<?xml') && lowerTrimmed.includes('<svg') && !lowerTrimmed.includes('<html')));

  const isImage =
    !isHtml &&
    (isSvg ||
      contentType.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|avif|ico|bmp)($|\?)/i.test(rawBody));

  const isPdf = !isHtml && (contentType.includes('application/pdf') || rawBody.startsWith('%PDF-'));
  const isAudio = !isHtml && contentType.startsWith('audio/');
  const isVideo = !isHtml && contentType.startsWith('video/');

  // Generate data URI for binary or SVG media
  const mediaSrc = React.useMemo(() => {
    if (isSvg) {
      if (rawBody.trim().startsWith('<svg')) {
        return `data:image/svg+xml;utf8,${encodeURIComponent(rawBody)}`;
      }
      if (base64Body) {
        return `data:image/svg+xml;base64,${base64Body}`;
      }
    }
    if (base64Body) {
      const mime = contentType.split(';')[0].trim() || 'application/octet-stream';
      return `data:${mime};base64,${base64Body}`;
    }
    // If body itself is already a data URL
    if (rawBody.startsWith('data:')) {
      return rawBody;
    }
    return '';
  }, [contentType, rawBody, base64Body, isSvg]);

  const handleDownload = () => {
    let url = mediaSrc;
    let filename = `response_${response.status}_${Date.now()}`;

    if (isImage) {
      filename += isSvg ? '.svg' : (contentType.split('/')[1]?.split(';')[0] || '.png');
    } else if (isPdf) {
      filename += '.pdf';
    } else if (isAudio) {
      filename += '.mp3';
    } else if (isVideo) {
      filename += '.mp4';
    } else if (isHtml) {
      filename += '.html';
    }

    if (!url) {
      const blob = new Blob([rawBody], { type: contentType || 'text/plain' });
      url = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpenInNewTab = () => {
    if (mediaSrc) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${mediaSrc}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  };

  // Image / SVG Previewer
  if (isImage) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-200">
              <Image className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSvg ? 'SVG Vector Preview' : 'Image Preview'}</span>
            </span>
            {imageDimensions && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                {imageDimensions.width} × {imageDimensions.height} px
              </span>
            )}
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {contentType.split(';')[0]}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowCheckerboard(!showCheckerboard)}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                showCheckerboard
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle transparency checkerboard grid"
            >
              Grid
            </button>

            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.2, Math.round((z - 0.25) * 100) / 100))}
                className="p-1 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[10px] text-slate-300 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100))}
                className="p-1 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1 hover:bg-slate-700 text-slate-400 border-l border-slate-700"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs transition-colors"
              title="Download image file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          className={`flex-1 overflow-auto flex items-center justify-center p-6 ${
            showCheckerboard
              ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950'
              : 'bg-slate-950'
          }`}
        >
          {mediaSrc ? (
            <div
              className="transition-transform duration-100 ease-out origin-center inline-block shadow-2xl rounded-lg overflow-hidden border border-slate-800"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={mediaSrc}
                alt="Response preview"
                className="max-h-[70vh] object-contain rounded select-none"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }}
              />
            </div>
          ) : (
            <div className="text-center p-8 text-slate-500">
              <p className="text-xs">Image payload could not be decoded.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // HTML Webview Previewer
  if (isHtml) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
        {/* HTML Header Toolbar */}
        <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-200">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Web / HTML Preview</span>
            </span>
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setHtmlViewMode('rendered')}
                className={`px-2 py-0.5 rounded flex items-center space-x-1 ${
                  htmlViewMode === 'rendered'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Rendered</span>
              </button>
              <button
                type="button"
                onClick={() => setHtmlViewMode('source')}
                className={`px-2 py-0.5 rounded flex items-center space-x-1 ${
                  htmlViewMode === 'source'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Source</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([rawBody], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const win = window.open(url, '_blank');
                if (!win) {
                  // Fallback for popups blocked
                  const a = document.createElement('a');
                  a.href = url;
                  a.target = '_blank';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }
              }}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs transition-colors"
              title="Open Rendered Page in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Open in Tab</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save .html</span>
            </button>
          </div>
        </div>

        {/* View Mode content */}
        {htmlViewMode === 'rendered' ? (
          <div className="flex-1 w-full bg-white relative">
            <iframe
              title="Rendered HTML Response"
              srcDoc={rawBody}
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
            {rawBody}
          </div>
        )}
      </div>
    );
  }

  // PDF Previewer
  if (isPdf) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
        <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-slate-200">PDF Document Preview</span>
          </div>
          <div className="flex items-center space-x-2">
            {mediaSrc && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Open in Tab</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full bg-slate-900 flex items-center justify-center p-4">
          {mediaSrc ? (
            <iframe
              title="PDF Document"
              src={mediaSrc}
              className="w-full h-full rounded-lg border border-slate-800 shadow-xl"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">PDF document received ({response.size} bytes)</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Download PDF File
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Audio Player Previewer
  if (isAudio) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Music className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">Audio Response Stream</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">{contentType} • {(response.size / 1024).toFixed(1)} KB</p>
          </div>

          {mediaSrc && (
            <audio controls src={mediaSrc} className="w-full rounded-lg outline-none" />
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Audio File</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video Player Previewer
  if (isVideo) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
        <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Video Response Preview</span>
            <span className="font-mono text-[10px] text-slate-400">{contentType}</span>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Video</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
          {mediaSrc && (
            <video controls src={mediaSrc} className="max-h-[70vh] rounded-xl shadow-2xl border border-slate-800" />
          )}
        </div>
      </div>
    );
  }

  // Fallback if rich preview requested on plain text/json
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
      <Info className="w-8 h-8 text-slate-600 mb-2" />
      <p className="text-sm font-semibold text-slate-300">Rich Preview not available for this content type</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        Rich preview activates automatically for Images (PNG, JPG, SVG, WebP), PDFs, Rendered HTML Webviews, Audio, and Videos.
      </p>
      <p className="text-[11px] font-mono text-emerald-400 mt-2 bg-slate-900 px-3 py-1 rounded border border-slate-800">
        Content-Type: {contentType || 'none'}
      </p>
    </div>
  );
};
