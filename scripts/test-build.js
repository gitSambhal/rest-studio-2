import fs from 'fs';
import path from 'path';

console.log('[Test Build] Verifying RestStudio single-binary executable build artifacts...');

const distDir = path.resolve('dist/reststudio');
const configPath = path.resolve('neutralino.config.json');

if (!fs.existsSync(configPath)) {
  console.error('[Test Error] neutralino.config.json missing!');
  process.exit(1);
}

const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (configData.applicationId !== 'top.suhail.rest-studio' || !configData.modes.window.title.includes('RestStudio')) {
  console.error('[Test Error] neutralino.config.json does not contain correct RestStudio configuration.');
  process.exit(1);
}
console.log('[Test Pass] neutralino.config.json verified correctly.');

if (!fs.existsSync(distDir)) {
  console.error('[Test Error] dist/reststudio directory missing. Run "npm run build:neu" first.');
  process.exit(1);
}

// Verify Windows single-binary executable
const winExe = path.join(distDir, 'RestStudio-Windows-x64.exe');
if (!fs.existsSync(winExe)) {
  console.error(`[Test Error] Missing Windows single binary executable: ${winExe}`);
  process.exit(1);
}
console.log(`[Test Pass] Windows single executable verified: ${winExe} (${(fs.statSync(winExe).size / (1024*1024)).toFixed(2)} MB)`);

// Verify Linux single-binary executables
['RestStudio-Linux-x64', 'RestStudio-Linux-ARM64', 'RestStudio-Linux-ARMhf'].forEach(bin => {
  const binPath = path.join(distDir, bin);
  if (!fs.existsSync(binPath)) {
    console.error(`[Test Error] Missing Linux single binary executable: ${binPath}`);
    process.exit(1);
  }
  console.log(`[Test Pass] Linux single executable verified: ${bin} (${(fs.statSync(binPath).size / (1024*1024)).toFixed(2)} MB)`);
});

// Verify macOS single-binary executables
['RestStudio-Mac-x64', 'RestStudio-Mac-ARM64', 'RestStudio-Mac-Universal'].forEach(bin => {
  const binPath = path.join(distDir, bin);
  if (!fs.existsSync(binPath)) {
    console.error(`[Test Error] Missing macOS single binary executable: ${binPath}`);
    process.exit(1);
  }
  console.log(`[Test Pass] macOS single executable verified: ${bin} (${(fs.statSync(binPath).size / (1024*1024)).toFixed(2)} MB)`);
});

console.log('[Test Success] All RestStudio single-binary executables verified successfully!');
