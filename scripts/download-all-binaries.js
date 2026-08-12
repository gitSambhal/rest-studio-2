import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const binDir = path.resolve('bin');
const requiredBinaries = [
  'neutralino-mac_x64',
  'neutralino-mac_arm64',
  'neutralino-mac_universal',
  'neutralino-win_x64.exe',
  'neutralino-linux_x64',
  'neutralino-linux_arm64',
  'neutralino-linux_armhf'
];

const hasAllBinaries = requiredBinaries.every(b => fs.existsSync(path.join(binDir, b)));

if (hasAllBinaries) {
  console.log('[Binary Downloader] All required Neutralinojs platform binaries present in bin/. Skipping network update.');
} else {
  console.log('[Binary Downloader] Updating Neutralinojs binaries and client...');
  try {
    process.env.NODE_OPTIONS = '--use-system-ca';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    execSync('npx @neutralinojs/neu update', { stdio: 'inherit' });
    console.log('[Binary Downloader] Binaries updated successfully.');
  } catch (e) {
    const hasAnyBinary = requiredBinaries.some(b => fs.existsSync(path.join(binDir, b)));
    if (hasAnyBinary) {
      console.warn('[Binary Downloader] Network update failed, but local binaries are present. Proceeding with existing binaries:', e.message);
    } else {
      console.error('[Binary Downloader] Error updating binaries and no local binaries found:', e.message);
      process.exit(1);
    }
  }
}

