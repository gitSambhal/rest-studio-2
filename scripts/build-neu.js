import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('====================================================');
console.log('[Neu Build System] Building RestStudio Executables & macOS App Bundles...');
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

// Step 0: Clean dist/reststudio to prevent recursive accumulation in resources.neu
fs.rmSync(distRestStudioDir, { recursive: true, force: true });

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
console.log('\n[Neu Build] Ensuring Web Frontend Assets exist...');
if (!fs.existsSync(path.resolve('dist/index.html'))) {
  execSync('npm run build:web', { stdio: 'inherit' });
}

// Ensure dist/reststudio is removed before neu build so it does not get bundled into resources.neu
fs.rmSync(distRestStudioDir, { recursive: true, force: true });

// Step 3: Run Neutralino build to generate resources.neu and platform binaries
console.log('\n[Neu Build] Running Neutralino build...');
execSync('npx @neutralinojs/neu build', { stdio: 'inherit' });

// Ensure neutralino.config.json is copied to dist/reststudio for portable distribution
if (fs.existsSync('neutralino.config.json')) {
  fs.copyFileSync('neutralino.config.json', path.join(distRestStudioDir, 'neutralino.config.json'));
}

// Helper: Strip invalid LC_CODE_SIGNATURE (0x1d) load command from Mach-O binaries modified by postject
function stripMachOCodeSignature(buf, offset = 0) {
  if (buf.length < offset + 32) return false;
  
  const magicBE = buf.readUInt32BE(offset);
  if (magicBE === 0xcafebabe || magicBE === 0xbebafeca) { // Fat / Universal binary
    const nfat_arch = buf.readUInt32BE(offset + 4);
    let strippedAny = false;
    for (let i = 0; i < nfat_arch; i++) {
      const sliceOffset = buf.readUInt32BE(offset + 16 + i * 20);
      if (stripMachOCodeSignature(buf, sliceOffset)) strippedAny = true;
    }
    return strippedAny;
  }
  
  const magicLE = buf.readUInt32LE(offset);
  if (magicLE === 0xfeedfacf || magicLE === 0xfeedface) { // 64-bit or 32-bit Mach-O
    const ncmds = buf.readUInt32LE(offset + 16);
    let cmdOffset = offset + (magicLE === 0xfeedfacf ? 32 : 28);
    for (let i = 0; i < ncmds; i++) {
      const cmd = buf.readUInt32LE(cmdOffset);
      const cmdsize = buf.readUInt32LE(cmdOffset + 4);
      if (cmd === 0x1d) { // LC_CODE_SIGNATURE
        buf.fill(0, cmdOffset, cmdOffset + cmdsize);
        return true;
      }
      cmdOffset += cmdsize;
    }
  }
  return false;
}

// Helper: Create native macOS .app bundle and POSIX 0755 zip
function makeMacAppBundle(appName, pristineBinPath, platformName) {
  const appPath = path.join(distRestStudioDir, `${appName}.app`);
  const zipPath = path.join(distRestStudioDir, `${appName}.zip`);

  fs.rmSync(appPath, { recursive: true, force: true });
  fs.mkdirSync(path.join(appPath, 'Contents/MacOS'), { recursive: true });
  fs.mkdirSync(path.join(appPath, 'Contents/Resources'), { recursive: true });

  // PkgInfo
  fs.writeFileSync(path.join(appPath, 'Contents/PkgInfo'), 'APPL????');

  // Info.plist
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>RestStudio</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleIdentifier</key>
    <string>top.suhail.rest-studio</string>
    <key>CFBundleName</key>
    <string>RestStudio</string>
    <key>CFBundleDisplayName</key>
    <string>RestStudio</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 Suhail Akhtar (suhail.top)</string>
</dict>
</plist>`;

  fs.writeFileSync(path.join(appPath, 'Contents/Info.plist'), plistContent);

  // Copy icon if available
  if (fs.existsSync('public/icon.png')) {
    fs.copyFileSync('public/icon.png', path.join(appPath, 'Contents/Resources/icon.png'));
  }

  // Copy pristine untouched binary into Contents/MacOS/RestStudio
  const targetBinaryPath = path.join(appPath, 'Contents/MacOS/RestStudio');
  fs.copyFileSync(pristineBinPath, targetBinaryPath);
  try {
    execSync(`chmod +x "${targetBinaryPath}"`);
  } catch {}

  // Copy resources.neu into Contents/MacOS and Contents/Resources
  const resNeuSrc = path.join(distRestStudioDir, 'resources.neu');
  if (fs.existsSync(resNeuSrc)) {
    fs.copyFileSync(resNeuSrc, path.join(appPath, 'Contents/MacOS/resources.neu'));
    fs.copyFileSync(resNeuSrc, path.join(appPath, 'Contents/Resources/resources.neu'));
  }

  // Copy neutralino.config.json into Contents/MacOS and Contents/Resources
  if (fs.existsSync('neutralino.config.json')) {
    fs.copyFileSync('neutralino.config.json', path.join(appPath, 'Contents/MacOS/neutralino.config.json'));
    fs.copyFileSync('neutralino.config.json', path.join(appPath, 'Contents/Resources/neutralino.config.json'));
  }

  // Create POSIX 0755 Zip archive via scripts/zip-app.py
  try {
    execSync(`python3 scripts/zip-app.py "${distRestStudioDir}" "${appName}.app" "${appName}.zip"`, { stdio: 'inherit' });
  } catch (e) {
    console.warn(`[Neu Build] Warning: could not zip ${appName}.app:`, e.message);
  }

  const appSize = (fs.statSync(targetBinaryPath).size / (1024 * 1024)).toFixed(2);
  const zipSize = fs.existsSync(zipPath) ? (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2) : 'N/A';
  console.log(`  ✓ ${platformName.padEnd(30)} -> ${appName}.app (${appSize} MB binary, Zip: ${zipSize} MB)`);
}

// Helper: Create portable Windows/Linux Zip containing binary + resources.neu + config
function makePortableZip(zipName, binaryFileName, exeDisplayName) {
  const zipPath = path.join(distRestStudioDir, zipName);
  const tempDir = path.join(distRestStudioDir, `_temp_${zipName.replace('.zip', '')}`);

  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const binSrc = path.join(distRestStudioDir, binaryFileName);
  if (fs.existsSync(binSrc)) {
    fs.copyFileSync(binSrc, path.join(tempDir, exeDisplayName));
  }
  const resSrc = path.join(distRestStudioDir, 'resources.neu');
  if (fs.existsSync(resSrc)) {
    fs.copyFileSync(resSrc, path.join(tempDir, 'resources.neu'));
  }
  if (fs.existsSync('neutralino.config.json')) {
    fs.copyFileSync('neutralino.config.json', path.join(tempDir, 'neutralino.config.json'));
  }
  if (fs.existsSync('public/icon.png')) {
    fs.copyFileSync('public/icon.png', path.join(tempDir, 'icon.png'));
  }

  try {
    execSync(`python3 -c "import zipfile, os; zf = zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED); [zf.write(os.path.join('${tempDir}', f), f) for f in os.listdir('${tempDir}')]"`);
    const zipSize = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
    console.log(`  ✓ Portable Zip Package          -> ${zipName} (${zipSize} MB)`);
  } catch (e) {
    console.warn(`[Neu Build] Warning: could not create ${zipName}:`, e.message);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Helper to patch Windows executable metadata and icon
async function patchWindowsExecutable() {
  const winBinPath = path.join(distRestStudioDir, 'reststudio-win_x64.exe');
  const winTarget = path.join(distRestStudioDir, 'RestStudio-Windows-x64.exe');
  const exeTarget = path.join(distRestStudioDir, 'RestStudio.exe');

  if (fs.existsSync(winBinPath)) {
    // Always copy first to guarantee targets exist regardless of metadata patching outcome
    fs.copyFileSync(winBinPath, winTarget);
    fs.copyFileSync(winBinPath, exeTarget);

    console.log('\n[Neu Build] Patching Windows executable metadata and icon...');
    try {
      let exepatchPath;
      try {
        exepatchPath = require.resolve('@neutralinojs/neu/src/modules/exepatch.js');
      } catch {
        const fallbacks = [
          'node_modules/@neutralinojs/neu/src/modules/exepatch.js',
          '../node_modules/@neutralinojs/neu/src/modules/exepatch.js'
        ];
        for (const p of fallbacks) {
          if (fs.existsSync(p)) { exepatchPath = path.resolve(p); break; }
        }
      }

      if (exepatchPath) {
        const { patchWindowsExecutable } = await import('file://' + exepatchPath);
        await patchWindowsExecutable(winBinPath);
        fs.copyFileSync(winBinPath, winTarget);
        fs.copyFileSync(winBinPath, exeTarget);
        console.log(`  ✓ Windows Executable Metadata Patched -> RestStudio.exe & RestStudio-Windows-x64.exe (${(fs.statSync(winBinPath).size / (1024*1024)).toFixed(2)} MB)`);
      } else {
        console.warn('  ⚠ Could not locate exepatch.js for Windows metadata patching');
      }
    } catch (err) {
      console.warn('  ⚠ Warning: Could not patch Windows executable metadata:', err.message);
    }
  }
}

// Step 4: Standardize and fix executables & native macOS .app bundles
console.log('\n[Neu Build] Standardizing executables and creating macOS GUI .app bundles in dist/reststudio/...');

await patchWindowsExecutable();

const binaryMap = [
  { raw: 'reststudio-mac_x64', target: 'RestStudio-Mac-x64', platform: 'macOS (x64 Intel)', binSource: 'bin/neutralino-mac_x64', appName: 'RestStudio-Mac-x64' },
  { raw: 'reststudio-mac_arm64', target: 'RestStudio-Mac-ARM64', platform: 'macOS (ARM64 Apple Silicon)', binSource: 'bin/neutralino-mac_arm64', appName: 'RestStudio-Mac-ARM64' },
  { raw: 'reststudio-mac_universal', target: 'RestStudio-Mac-Universal', platform: 'macOS (Universal Binary)', binSource: 'bin/neutralino-mac_universal', appName: 'RestStudio-Mac-Universal' },
  { raw: 'reststudio-linux_x64', target: 'RestStudio-Linux-x64', platform: 'Linux (x64)' },
  { raw: 'reststudio-linux_arm64', target: 'RestStudio-Linux-ARM64', platform: 'Linux (ARM64)' },
  { raw: 'reststudio-linux_armhf', target: 'RestStudio-Linux-ARMhf', platform: 'Linux (ARMhf)' },
];

binaryMap.forEach(({ raw, target, platform, binSource, appName }) => {
  const rawPath = path.join(distRestStudioDir, raw);
  const targetPath = path.join(distRestStudioDir, target);

  if (fs.existsSync(rawPath)) {
    // Strip code signatures from postject-embedded Mac binaries so standalone CLI execution won't trigger zsh: killed
    if (raw.includes('mac')) {
      try {
        const buf = fs.readFileSync(rawPath);
        if (stripMachOCodeSignature(buf)) {
          fs.writeFileSync(rawPath, buf);
        }
      } catch {}
    }

    // Grant execution permissions
    if (!target.endsWith('.exe')) {
      try {
        execSync(`chmod +x "${rawPath}"`);
      } catch {}
    }

    // Keep both exact raw name and standardized target name
    if (rawPath !== targetPath) {
      fs.copyFileSync(rawPath, targetPath);
      if (!target.endsWith('.exe')) {
        try {
          execSync(`chmod +x "${targetPath}"`);
        } catch {}
      }
    }

    const stat = fs.statSync(targetPath);
    console.log(`  ✓ ${platform.padEnd(30)} -> ${target} (${(stat.size / (1024 * 1024)).toFixed(2)} MB standalone)`);

    // Create macOS GUI .app bundle if this is a Mac target
    if (binSource && appName) {
      makeMacAppBundle(appName, binSource, platform);
    }
  } else {
    console.warn(`  ⚠ Warning: Binary ${raw} not found in dist/reststudio`);
  }
});

// Also create default RestStudio.app (Universal) and RestStudio.zip for instant macOS distribution
if (fs.existsSync('bin/neutralino-mac_universal')) {
  makeMacAppBundle('RestStudio', 'bin/neutralino-mac_universal', 'macOS (Default App Bundle)');
}

// Generate portable Zip packages for Windows and Linux containing binary + resources.neu + neutralino.config.json
console.log('\n[Neu Build] Generating portable Zip packages for Windows and Linux...');
makePortableZip('RestStudio-Windows-x64.zip', 'RestStudio-Windows-x64.exe', 'RestStudio.exe');
makePortableZip('RestStudio-Linux-x64.zip', 'RestStudio-Linux-x64', 'RestStudio');
makePortableZip('RestStudio-Linux-ARM64.zip', 'RestStudio-Linux-ARM64', 'RestStudio');
makePortableZip('RestStudio-Linux-ARMhf.zip', 'RestStudio-Linux-ARMhf', 'RestStudio');

// Mirror all artifacts from dist/reststudio to dist/ root so artifact exporters can find them at either path
if (fs.existsSync(distRestStudioDir)) {
  const items = fs.readdirSync(distRestStudioDir);
  for (const item of items) {
    const srcPath = path.join(distRestStudioDir, item);
    const destPath = path.join(path.resolve('dist'), item);
    if (!fs.existsSync(destPath) || item.startsWith('RestStudio')) {
      try {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } catch {}
    }
  }
}

console.log('\n====================================================');
console.log('[Neu Build System] All single-binary executables & macOS .app bundles generated successfully!');
console.log('====================================================\n');
