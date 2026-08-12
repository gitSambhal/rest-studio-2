import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execSync } from 'child_process';

/**
 * Creates native macOS .app bundles and POSIX-permission-preserving .zip archives for Neutralino build targets.
 * Fixes "Application can't be opened" on Mac by:
 * 1. Using a shell launcher in Contents/MacOS/RestStudio that sets correct cwd, permissions, and strips quarantine flags.
 * 2. Embedding resources and binaries properly inside Contents/MacOS/ and Contents/Resources/.
 * 3. Packaging .zip archives with explicit POSIX 0755 executable file attributes so Mac Archive Utility extracts runnable binaries.
 */

const distRestStudioDir = path.resolve('dist/reststudio');
const binDir = path.resolve('bin');

const targets = [
  { appName: 'RestStudio-Mac-ARM64.app', zipName: 'RestStudio-Mac-ARM64.zip', binName: 'RestStudio-Mac-ARM64', binary: 'neutralino-mac_arm64' },
  { appName: 'RestStudio-Mac-x64.app', zipName: 'RestStudio-Mac-x64.zip', binName: 'RestStudio-Mac-x64', binary: 'neutralino-mac_x64' },
  { appName: 'RestStudio-Mac-Universal.app', zipName: 'RestStudio-Mac-Universal.zip', binName: 'RestStudio-Mac-Universal', binary: 'neutralino-mac_universal' },
];

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Custom ZIP builder that explicitly writes POSIX 0755 executable attributes
 * to central directory headers so macOS Archive Utility & Finder extract runnable .app binaries.
 */
function createZipWithPosixPermissions(sourceDir, zipFilePath) {
  const fileEntries = [];

  function walkDir(currentDir, relativePath) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const relPath = relativePath ? relativePath + '/' + file : file;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        fileEntries.push({
          path: relPath + '/',
          isDir: true,
          mode: 0o755,
          data: Buffer.alloc(0),
        });
        walkDir(fullPath, relPath);
      } else {
        const isExec = (stat.mode & 0o111) !== 0 || relPath.includes('Contents/MacOS/');
        fileEntries.push({
          path: relPath,
          isDir: false,
          mode: isExec ? 0o755 : 0o644,
          data: fs.readFileSync(fullPath),
        });
      }
    }
  }

  const baseName = path.basename(sourceDir);
  if (fs.statSync(sourceDir).isDirectory()) {
    fileEntries.push({
      path: baseName + '/',
      isDir: true,
      mode: 0o755,
      data: Buffer.alloc(0),
    });
    walkDir(sourceDir, baseName);
  }

  const localHeaders = [];
  const cdHeaders = [];
  let currentOffset = 0;

  for (const entry of fileEntries) {
    const fileNameBuf = Buffer.from(entry.path, 'utf8');
    const compressedData = entry.isDir ? Buffer.alloc(0) : zlib.deflateRawSync(entry.data);
    const crc = entry.isDir ? 0 : crc32(entry.data);

    // Local Header
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // Flags
    localHeader.writeUInt16LE(8, 8); // Compression method (Deflate)
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileNameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central Directory Header
    const cdHeader = Buffer.alloc(46 + fileNameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // CD header signature
    cdHeader.writeUInt16LE(0x031e, 4); // Version made by (0x03 = Unix, spec 3.0)
    cdHeader.writeUInt16LE(20, 6); // Version needed
    cdHeader.writeUInt16LE(0, 8); // Flags
    cdHeader.writeUInt16LE(8, 10); // Compression method
    cdHeader.writeUInt16LE(0, 12); // Mod time
    cdHeader.writeUInt16LE(0, 14); // Mod date
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compressedData.length, 20);
    cdHeader.writeUInt32LE(entry.data.length, 24);
    cdHeader.writeUInt16LE(fileNameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);

    // POSIX permissions in high word of external file attributes
    const externalAttr = entry.isDir
      ? (0o040755 << 16) | 0x10 // Directory + Unix mode 755
      : (0o100000 | entry.mode) << 16; // Regular File + Unix mode (755 or 644)

    cdHeader.writeUInt32LE(externalAttr >>> 0, 38);
    cdHeader.writeUInt32LE(currentOffset, 42);
    fileNameBuf.copy(cdHeader, 46);

    cdHeaders.push(cdHeader);

    currentOffset += localHeader.length + compressedData.length;
  }

  const cdOffset = currentOffset;
  let cdSize = 0;
  for (const h of cdHeaders) cdSize += h.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const finalZipBuffer = Buffer.concat([...localHeaders, ...cdHeaders, eocd]);
  fs.writeFileSync(zipFilePath, finalZipBuffer);
}

let totalCreated = 0;

function ensureResourcesNeu() {
  const resNeuPath = path.resolve('.neu/resources.neu');
  if (fs.existsSync(resNeuPath)) return resNeuPath;
  
  const tempDir = path.resolve('.neu_temp_res');
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
  
  if (fs.existsSync('dist')) {
    fs.cpSync('dist', path.join(tempDir, 'dist'), { recursive: true });
  }
  if (fs.existsSync('neutralino.config.json')) {
    fs.copyFileSync('neutralino.config.json', path.join(tempDir, 'neutralino.config.json'));
  }
  
  fs.mkdirSync(path.dirname(resNeuPath), { recursive: true });
  createZipWithPosixPermissions(tempDir, resNeuPath);
  fs.rmSync(tempDir, { recursive: true, force: true });
  return resNeuPath;
}

if (fs.existsSync(binDir) || fs.existsSync(distRestStudioDir)) {
  let resNeuPath = path.join(distRestStudioDir, 'resources.neu');
  if (!fs.existsSync(resNeuPath)) {
    const generatedResPath = ensureResourcesNeu();
    if (fs.existsSync(generatedResPath) && fs.existsSync(distRestStudioDir)) {
      fs.copyFileSync(generatedResPath, resNeuPath);
    }
  }

  targets.forEach(({ appName, zipName, binName, binary }) => {
    let binaryPath = path.join(distRestStudioDir, binary);
    if (!fs.existsSync(binaryPath)) {
      binaryPath = path.join(binDir, binary);
    }
    if (!fs.existsSync(binaryPath)) return;

    const appDir = path.join(distRestStudioDir, appName);
    const contentsDir = path.join(appDir, 'Contents');
    const macOSDir = path.join(contentsDir, 'MacOS');
    const resourcesDir = path.join(contentsDir, 'Resources');

    fs.rmSync(appDir, { recursive: true, force: true });
    fs.mkdirSync(macOSDir, { recursive: true });
    fs.mkdirSync(resourcesDir, { recursive: true });

    // 1. Copy executable binary to Contents/MacOS/RestStudio-bin and create launcher script Contents/MacOS/RestStudio
    const realBinaryTarget = path.join(macOSDir, 'RestStudio-bin');
    fs.copyFileSync(binaryPath, realBinaryTarget);
    fs.chmodSync(realBinaryTarget, 0o755);

    const launcherPath = path.join(macOSDir, 'RestStudio');
    const launcherScript = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
exec "$DIR/RestStudio-bin" "$@"
`;
    fs.writeFileSync(launcherPath, launcherScript, { mode: 0o755 });
    fs.chmodSync(launcherPath, 0o755);

    // 2. Copy resources.neu to Contents/MacOS and Contents/Resources
    if (fs.existsSync(resNeuPath)) {
      fs.copyFileSync(resNeuPath, path.join(macOSDir, 'resources.neu'));
      fs.copyFileSync(resNeuPath, path.join(resourcesDir, 'resources.neu'));
    }

    // 3. Copy neutralino.config.json to Contents/MacOS and Contents/Resources
    if (fs.existsSync('neutralino.config.json')) {
      fs.copyFileSync('neutralino.config.json', path.join(macOSDir, 'neutralino.config.json'));
      fs.copyFileSync('neutralino.config.json', path.join(resourcesDir, 'neutralino.config.json'));
    }

    // 4. Copy icon
    if (fs.existsSync('public/icon.png')) {
      fs.copyFileSync('public/icon.png', path.join(resourcesDir, 'icon.png'));
    }

    // 5. Create PkgInfo
    fs.writeFileSync(path.join(contentsDir, 'PkgInfo'), 'APPL????');

    // 6. Create Info.plist
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>RestStudio</string>
    <key>CFBundleIconFile</key>
    <string>icon.png</string>
    <key>CFBundleIdentifier</key>
    <string>top.suhail.rest-studio</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
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
    <string>Copyright © 2026 RestStudio</string>
</dict>
</plist>`;

    fs.writeFileSync(path.join(contentsDir, 'Info.plist'), plistContent);

    // 7. Ad-hoc Code Sign and clear quarantine
    try {
      execSync(`codesign --sign - --force --deep "${appDir}" 2>/dev/null || true`);
      execSync(`chmod -R +x "${macOSDir}" 2>/dev/null || true`);
      execSync(`xattr -cr "${appDir}" 2>/dev/null || true`);
    } catch (e) {
      console.warn('[Mac App Bundler] Code sign warning:', e.message);
    }

    console.log(`[Mac App Bundler] Created native macOS App bundle: ${appDir}`);

    // 8. Create POSIX 0755 Zip Package
    const zipPath = path.join(distRestStudioDir, zipName);
    fs.rmSync(zipPath, { force: true });
    createZipWithPosixPermissions(appDir, zipPath);
    console.log(`[Mac App Bundler] Created POSIX 0755 macOS ZIP package: ${zipPath}`);

    // 9. Create standalone Mac executable binary in dist/reststudio/
    const standaloneBinPath = path.join(distRestStudioDir, binName);
    fs.copyFileSync(binaryPath, standaloneBinPath);
    fs.chmodSync(standaloneBinPath, 0o755);
    console.log(`[Mac App Bundler] Created standalone Mac executable: ${standaloneBinPath}`);

    totalCreated++;
  });
}

// Clean up raw intermediate binary files
if (fs.existsSync(distRestStudioDir)) {
  ['reststudio-mac_arm64', 'reststudio-mac_x64', 'reststudio-mac_universal'].forEach((rawBinary) => {
    const rawPath = path.join(distRestStudioDir, rawBinary);
    if (fs.existsSync(rawPath)) {
      fs.unlinkSync(rawPath);
    }
  });
}

if (totalCreated === 0) {
  console.log('[Mac App Bundler] No macOS binaries found to bundle into .app packages.');
}
