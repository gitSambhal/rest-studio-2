import fs from 'fs';
import path from 'path';

console.log('[Test Build] Verifying RestStudio build artifacts and configuration integrity...');

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

// Check Windows executable and ZIP package
const winExe = path.join(distDir, 'RestStudio-Windows-x64.exe');
const winZip = path.join(distDir, 'RestStudio-Windows-x64.zip');
const winPkgDir = path.join(distDir, 'RestStudio-Windows-x64');
const winPkgRes = path.join(winPkgDir, 'resources.neu');

if (!fs.existsSync(winExe)) {
  console.error(`[Test Error] Missing Windows executable: ${winExe}`);
  process.exit(1);
}
if (!fs.existsSync(winZip)) {
  console.error(`[Test Error] Missing Windows zip package: ${winZip}`);
  process.exit(1);
}
if (!fs.existsSync(winPkgRes)) {
  console.error(`[Test Error] Missing resources.neu in Windows package folder: ${winPkgRes}`);
  process.exit(1);
}
console.log(`[Test Pass] Windows executable found: ${winExe} (${(fs.statSync(winExe).size / (1024*1024)).toFixed(2)} MB)`);
console.log(`[Test Pass] Windows zip package found: ${winZip} (${(fs.statSync(winZip).size / (1024*1024)).toFixed(2)} MB)`);

// Check Linux binaries
['RestStudio-Linux-x64', 'RestStudio-Linux-ARM64', 'RestStudio-Linux-ARMhf'].forEach(bin => {
  const binPath = path.join(distDir, bin);
  if (!fs.existsSync(binPath)) {
    console.error(`[Test Error] Missing Linux binary: ${binPath}`);
    process.exit(1);
  }
  console.log(`[Test Pass] Linux binary found: ${bin}`);
});

// Check Mac App bundles and Zips
['RestStudio-Mac-x64', 'RestStudio-Mac-ARM64', 'RestStudio-Mac-Universal'].forEach(target => {
  const appDir = path.join(distDir, `${target}.app`);
  const zipPath = path.join(distDir, `${target}.zip`);

  if (!fs.existsSync(appDir)) {
    console.error(`[Test Error] Missing macOS app bundle: ${appDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(zipPath)) {
    console.error(`[Test Error] Missing macOS zip archive: ${zipPath}`);
    process.exit(1);
  }

  // Verify executable binary and resources inside app bundle
  const macMacOSExec = path.join(appDir, 'Contents/MacOS/RestStudio');
  const macResNeu = path.join(appDir, 'Contents/MacOS/resources.neu');

  if (!fs.existsSync(macMacOSExec)) {
    console.error(`[Test Error] Missing executable inside macOS bundle ${target}.app`);
    process.exit(1);
  }
  if (!fs.existsSync(macResNeu)) {
    console.error(`[Test Error] Missing resources.neu inside macOS bundle ${target}.app`);
    process.exit(1);
  }

  const stat = fs.statSync(macMacOSExec);
  const resStat = fs.statSync(macResNeu);
  console.log(`[Test Pass] macOS bundle & zip verified for ${target} (exec: ${(stat.size / (1024*1024)).toFixed(2)} MB, resources: ${(resStat.size / (1024*1024)).toFixed(2)} MB)`);
});

console.log('[Test Success] All RestStudio build artifacts and bundle configurations verified successfully!');
