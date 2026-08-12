import { execSync } from 'child_process';

console.log('[Binary Downloader] Updating Neutralinojs binaries and client...');
try {
  process.env.NODE_OPTIONS = '--use-system-ca';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  execSync('npx @neutralinojs/neu update', { stdio: 'inherit' });
  console.log('[Binary Downloader] Binaries updated successfully.');
} catch (e) {
  console.error('[Binary Downloader] Error updating binaries:', e.message);
  process.exit(1);
}
