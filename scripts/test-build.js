import fs from 'fs';
import path from 'path';

console.log('[Test Build] Verifying RestStudio build artifacts and macOS Application Bundles...');

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
console.log(`[Test Pass] Windows executable verified: ${winExe} (${(fs.statSync(winExe).size / (1024*1024)).toFixed(2)} MB)`);

// Verify Linux single-binary executables
['RestStudio-Linux-x64', 'RestStudio-Linux-ARM64', 'RestStudio-Linux-ARMhf'].forEach(bin => {
  const binPath = path.join(distDir, bin);
  if (!fs.existsSync(binPath)) {
    console.error(`[Test Error] Missing Linux binary executable: ${binPath}`);
    process.exit(1);
  }
  console.log(`[Test Pass] Linux executable verified: ${bin} (${(fs.statSync(binPath).size / (1024*1024)).toFixed(2)} MB)`);
});

// Verify macOS standalone single-binary executables
['RestStudio-Mac-x64', 'RestStudio-Mac-ARM64', 'RestStudio-Mac-Universal'].forEach(bin => {
  const binPath = path.join(distDir, bin);
  if (!fs.existsSync(binPath)) {
    console.error(`[Test Error] Missing macOS standalone executable: ${binPath}`);
    process.exit(1);
  }
  console.log(`[Test Pass] macOS standalone executable verified: ${bin} (${(fs.statSync(binPath).size / (1024*1024)).toFixed(2)} MB)`);
});

// Verify native macOS .app bundles and zip archives
['RestStudio-Mac-x64', 'RestStudio-Mac-ARM64', 'RestStudio-Mac-Universal', 'RestStudio'].forEach(appName => {
  const appPath = path.join(distDir, `${appName}.app`);
  const zipPath = path.join(distDir, `${appName}.zip`);
  const execPath = path.join(appPath, 'Contents/MacOS/RestStudio');
  const resNeuPath = path.join(appPath, 'Contents/MacOS/resources.neu');
  const configPath = path.join(appPath, 'Contents/MacOS/neutralino.config.json');
  const plistPath = path.join(appPath, 'Contents/Info.plist');

  if (!fs.existsSync(appPath) || !fs.existsSync(execPath) || !fs.existsSync(resNeuPath) || !fs.existsSync(configPath) || !fs.existsSync(plistPath)) {
    console.error(`[Test Error] Missing or invalid macOS .app bundle structure for ${appName}.app`);
    process.exit(1);
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`[Test Error] Missing macOS .app zip archive: ${zipPath}`);
    process.exit(1);
  }

  console.log(`[Test Pass] macOS .app bundle & zip verified: ${appName}.app (${(fs.statSync(execPath).size / (1024*1024)).toFixed(2)} MB binary, zip: ${(fs.statSync(zipPath).size / (1024*1024)).toFixed(2)} MB)`);
});

console.log('[Test Success] All RestStudio executables and native macOS .app bundles verified successfully!');
