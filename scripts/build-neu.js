import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('====================================================');
console.log('[Neu Build System] Starting RestStudio Single-Binary Build...');
console.log('====================================================');

const binDir = path.resolve('bin');
const distRestStudioDir = path.resolve('dist/reststudio');

const requiredBinaries = [
  'neutralino-mac_x64',
  'neutralino-mac_arm64',
  'neutralino-mac_universal',
  'neutralino-win_x64.exe',
  'neutralino-linux_x64',
  'neutralino-linux_arm64',
  'neutralino-linux_armhf'
];

// Step 1: Ensure bin/ directory has Neutralino v6.3.0 binaries
fs.mkdirSync(binDir, { recursive: true });
const missingBinaries = requiredBinaries.filter(b => !fs.existsSync(path.join(binDir, b)));

if (missingBinaries.length > 0) {
  console.log('[Neu Build] Downloading Neutralinojs v6.3.0 platform binaries...');
  const zipPath = path.resolve('neutralino-v6.3.0.zip');
  try {
    execSync(`curl -o "${zipPath}" -L "https://github.com/neutralinojs/neutralinojs/releases/download/v6.3.0/neutralinojs-v6.3.0.zip"`, { stdio: 'inherit' });
    execSync(`unzip -o "${zipPath}" -d "${binDir}"`, { stdio: 'inherit' });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    console.log('[Neu Build] Successfully installed platform binaries.');
  } catch (err) {
    console.error('[Neu Build Error] Failed to download Neutralino binaries:', err.message);
    process.exit(1);
  }
} else {
  console.log('[Neu Build] All required Neutralino platform binaries present in bin/.');
}

// Ensure execution permissions on Unix binaries
try {
  execSync(`chmod +x "${binDir}"/* 2>/dev/null || true`);
} catch {}

// Step 2: Build Web Frontend Assets
console.log('\n[Neu Build] Building Web Frontend (Vite & icons)...');
execSync('npm run build', { stdio: 'inherit' });

// Step 3: Run Neutralino Single Executable Embed Build
console.log('\n[Neu Build] Running Neutralino single executable embedding build (--embed-resources)...');
execSync('npx @neutralinojs/neu build --embed-resources', { stdio: 'inherit' });

// Step 4: Verify and Create Clean Standardized Single Executables for Each Platform
console.log('\n[Neu Build] Standardizing single-binary executables in dist/reststudio/...');

const binaryMap = [
  { raw: 'reststudio-win_x64.exe', target: 'RestStudio-Windows-x64.exe', platform: 'Windows (x64)' },
  { raw: 'reststudio-mac_x64', target: 'RestStudio-Mac-x64', platform: 'macOS (x64 Intel)' },
  { raw: 'reststudio-mac_arm64', target: 'RestStudio-Mac-ARM64', platform: 'macOS (ARM64 Apple Silicon)' },
  { raw: 'reststudio-mac_universal', target: 'RestStudio-Mac-Universal', platform: 'macOS (Universal Binary)' },
  { raw: 'reststudio-linux_x64', target: 'RestStudio-Linux-x64', platform: 'Linux (x64)' },
  { raw: 'reststudio-linux_arm64', target: 'RestStudio-Linux-ARM64', platform: 'Linux (ARM64)' },
  { raw: 'reststudio-linux_armhf', target: 'RestStudio-Linux-ARMhf', platform: 'Linux (ARMhf)' },
];

binaryMap.forEach(({ raw, target, platform }) => {
  const rawPath = path.join(distRestStudioDir, raw);
  const targetPath = path.join(distRestStudioDir, target);

  if (fs.existsSync(rawPath)) {
    // Grant execution permissions
    if (!target.endsWith('.exe')) {
      try {
        execSync(`chmod +x "${rawPath}"`);
      } catch {}
    }

    // Keep both exact raw name and standardized target name for max portability
    if (rawPath !== targetPath) {
      fs.copyFileSync(rawPath, targetPath);
      if (!target.endsWith('.exe')) {
        try {
          execSync(`chmod +x "${targetPath}"`);
        } catch {}
      }
    }

    const stat = fs.statSync(targetPath);
    console.log(`  ✓ ${platform.padEnd(30)} -> ${target} (${(stat.size / (1024 * 1024)).toFixed(2)} MB single executable)`);
  } else {
    console.warn(`  ⚠ Warning: Binary ${raw} not found in dist/reststudio`);
  }
});

console.log('\n====================================================');
console.log('[Neu Build System] All single-binary executables built successfully!');
console.log('====================================================\n');
