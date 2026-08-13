import React, { useState, useEffect } from 'react';
import { checkDesktopProxyHealth, DesktopProxyHealth } from '../utils/localhostBridge';
import {
  X,
  Copy,
  Check,
  Zap,
  Terminal,
  ShieldCheck,
  Globe,
  RefreshCw,
  Server,
  Play,
  Monitor,
} from 'lucide-react';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [proxyHealth, setProxyHealth] = useState<DesktopProxyHealth>({ active: false, port: 28108 });
  const [isChecking, setIsChecking] = useState(false);

  const refreshHealth = async () => {
    setIsChecking(true);
    try {
      const h = await checkDesktopProxyHealth();
      setProxyHealth(h);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const isNativeApp = typeof window !== 'undefined' && Boolean(
    (window as any).Neutralino ||
    (window as any).NL_PORT ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__ ||
    window.location.protocol === 'file:'
  );

  const ONE_LINE_PROXY_CMD = `node -e "const h=require('http'),s=require('https');h.createServer((q,r)=>{r.setHeader('Access-Control-Allow-Origin','*');r.setHeader('Access-Control-Allow-Methods','*');r.setHeader('Access-Control-Allow-Headers','*');r.setHeader('Access-Control-Allow-Private-Network','true');if(q.method==='OPTIONS'){r.writeHead(204);return r.end();}if(q.url==='/health'){r.writeHead(200,{'Content-Type':'application/json'});return r.end('{\\"status\\":\\"ok\\",\\"port\\":28108}');}if(q.url==='/proxy'&&q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{try{const p=JSON.parse(b||'{}'),{method='GET',url,headers={},body}=p,u=new URL(url),t=u.protocol==='https:'?s:h,S=Date.now();const R=t.request({hostname:u.hostname==='localhost'?'127.0.0.1':u.hostname,port:u.port||(u.protocol==='https:'?443:80),path:u.pathname+u.search,method:method.toUpperCase(),headers,rejectUnauthorized:false},z=>{let D='';z.on('data',c=>D+=c);z.on('end',()=>{const H={};Object.keys(z.headers).forEach(k=>H[k]=z.headers[k]);r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({status:z.statusCode,statusText:z.statusMessage||'OK',headers:H,body:D,size:Buffer.byteLength(D),duration:Date.now()-S,timestamp:Date.now(),ok:z.statusCode>=200&&z.statusCode<300}));});});R.on('error',e=>{r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({status:0,statusText:'Network Error',headers:{},body:JSON.stringify({error:e.message}),size:0,duration:Date.now()-S,timestamp:Date.now(),ok:false,error:e.message}));});if(body!==undefined)R.write(typeof body==='object'?JSON.stringify(body):String(body));R.end();}catch(e){r.writeHead(500);r.end(JSON.stringify({error:e.message}));}});return;}r.writeHead(404);r.end();}).listen(28108,'127.0.0.1',()=>console.log('RestStudio Proxy running on http://127.0.0.1:28108'));"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
          isDarkMode
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-emerald-950/30'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Monitor className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Desktop Localhost & CORS Proxy Agent</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  proxyHealth.active
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {proxyHealth.active ? '🟢 ACTIVE (127.0.0.1:28108)' : '⚪ OFFLINE'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect your Netlify web app (<code className="text-emerald-400 font-mono">https://reststudio.netlify.app</code>) directly to your local machine&apos;s <code className="text-emerald-400 font-mono">localhost</code> APIs!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 max-h-[75vh]">
          {/* Status Box */}
          <div className={`p-4 rounded-xl border transition-all ${
            isNativeApp || proxyHealth.active
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${isNativeApp || proxyHealth.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm">
                    {isNativeApp
                      ? 'RestStudio Native Desktop App Active'
                      : proxyHealth.active
                        ? 'Proxy Agent Connected and Listening'
                        : 'Proxy Agent Not Running on Port 28108'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isNativeApp ? (
                      <span>
                        RestStudio is running directly as a native desktop application. All HTTP requests to <code className="text-emerald-400 font-mono">localhost</code> and remote APIs execute natively with full OS privileges and zero CORS blocking!
                      </span>
                    ) : proxyHealth.active ? (
                      <span>
                        Your web browser is connected to the Desktop Proxy Agent on <code className="text-emerald-400 font-mono">http://127.0.0.1:28108</code>. Requests to <code className="text-emerald-400 font-mono">localhost</code> and local dev servers route directly through your local machine!
                      </span>
                    ) : (
                      <span>
                        Web browsers block secure HTTPS websites from accessing <code className="text-amber-300 font-mono">http://localhost</code> directly. Running the proxy agent on your computer bridges the connection for web browser users.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {!isNativeApp && (
                <button
                  type="button"
                  onClick={refreshHealth}
                  disabled={isChecking}
                  className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono px-3 py-1.5 rounded-lg border border-slate-700 transition-colors shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isChecking ? 'Checking...' : 'Re-check'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Show setup commands ONLY if on Web Browser AND Proxy is Offline */}
          {!isNativeApp && !proxyHealth.active && (
            <>
              {/* Setup Method 1: Quick 1-Line Command */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      For Web Browser Users: Instant 1-Line Command
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(ONE_LINE_PROXY_CMD, 'cmd_1')}
                    className="flex items-center space-x-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedCmd === 'cmd_1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'cmd_1' ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Open a terminal window on your computer (macOS Terminal, Linux Bash, or Windows PowerShell) and paste this 1-line Node command to start the proxy agent instantly:
                </p>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-400 whitespace-pre">
                  node -e &quot;const h=require(&apos;http&apos;)...listen(28108,&apos;127.0.0.1&apos;)&quot;
                </div>
              </div>

              {/* Setup Method 2: npm run proxy */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4 text-teal-400" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      For Local Project Users: npm run proxy
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('npm run proxy', 'cmd_2')}
                    className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedCmd === 'cmd_2' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'cmd_2' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  If you cloned or exported the project locally on your machine, run this in your project directory:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="text-teal-300">npm run proxy</span>
                    <span className="text-[10px] text-slate-500">Standalone Proxy</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="text-teal-300">npm run dev</span>
                    <span className="text-[10px] text-slate-500">Full Web App + Proxy</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Features bullet list */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
            <h5 className="font-bold text-emerald-400 text-xs flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Proxy Agent Capabilities</span>
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Chrome Private Network Access (PNA)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Custom Headers & Auth tokens</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero CORS Header Restrictions</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>High Performance &amp; Low Latency</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span>Agent Port:</span>
            <code className="text-emerald-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-bold">127.0.0.1:28108</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
