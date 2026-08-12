import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Processes Windows executables and creates a complete package.
 * Windows executable requires resources.neu and neutralino.config.json in its directory to run correctly.
 */
function processWindowsExecutables(distDir) {
  let winExePath = path.join(distDir, 'reststudio-win_x64.exe');
  if (!fs.existsSync(winExePath)) {
    winExePath = path.resolve('bin/neutralino-win_x64.exe');
  }

  if (!fs.existsSync(winExePath)) {
    console.warn('[Win Build] Windows binary reststudio-win_x64.exe missing.');
    return;
  }

  try {
    // 1. Create Windows package directory containing executable + resources.neu + config
    const winPkgDir = path.join(distDir, 'RestStudio-Windows-x64');
    fs.mkdirSync(winPkgDir, { recursive: true });

    const pkgExePath = path.join(winPkgDir, 'RestStudio.exe');
    fs.copyFileSync(winExePath, pkgExePath);
    fs.copyFileSync(winExePath, path.join(winPkgDir, 'RestStudio-Windows-x64.exe'));

    let resNeuPath = path.join(distDir, 'resources.neu');
    if (!fs.existsSync(resNeuPath) && fs.existsSync('.neu/resources.neu')) {
      resNeuPath = path.resolve('.neu/resources.neu');
    }

    if (fs.existsSync(resNeuPath)) {
      fs.copyFileSync(resNeuPath, path.join(winPkgDir, 'resources.neu'));
      fs.copyFileSync(resNeuPath, path.join(distDir, 'resources.neu'));
    }

    if (fs.existsSync('neutralino.config.json')) {
      fs.copyFileSync('neutralino.config.json', path.join(winPkgDir, 'neutralino.config.json'));
      fs.copyFileSync('neutralino.config.json', path.join(distDir, 'neutralino.config.json'));
    }

    if (fs.existsSync('public/icon.png')) {
      fs.copyFileSync('public/icon.png', path.join(winPkgDir, 'icon.png'));
      fs.copyFileSync('public/icon.png', path.join(winPkgDir, 'RestStudio.png'));
      fs.copyFileSync('public/icon.png', path.join(distDir, 'icon.png'));
    }

    // 2. Standalone Windows Executable in dist/reststudio
    const finalWinExePath = path.join(distDir, 'RestStudio-Windows-x64.exe');
    fs.copyFileSync(winExePath, finalWinExePath);
    fs.copyFileSync(winExePath, path.join(distDir, 'RestStudio.exe'));

    // 3. Create Windows ZIP Package (RestStudio-Windows-x64.zip)
    const winZipPath = path.join(distDir, 'RestStudio-Windows-x64.zip');
    fs.rmSync(winZipPath, { force: true });

    try {
      const sevenZipPath = path.resolve('node_modules/7zip-bin/linux/x64/7za');
      if (fs.existsSync(sevenZipPath)) {
        execSync(`"${sevenZipPath}" a -tzip "${winZipPath}" "${winPkgDir}/*" >/dev/null 2>&1 || true`);
      } else {
        execSync(`zip -r "${winZipPath}" .`, { cwd: winPkgDir, stdio: 'ignore' });
      }
    } catch (e) {
      console.warn('[Win Build] Note on Zip creation:', e.message);
    }

    const exeStats = fs.statSync(finalWinExePath);
    console.log(`[Win Build] Created Windows App Package & Executable (${(exeStats.size / (1024 * 1024)).toFixed(2)} MB): ${finalWinExePath}`);
    if (fs.existsSync(winZipPath)) {
      console.log(`[Win Build] Created Windows Portable ZIP Package (${(fs.statSync(winZipPath).size / (1024 * 1024)).toFixed(2)} MB): ${winZipPath}`);
    }
  } catch (err) {
    console.warn('[Win Build] Error processing Windows executable:', err.message);
  }
}

/**
 * Processes Linux executables generated with Neutralino's --embed-resources mode.
 */
function processLinuxExecutables(distDir) {
  const linuxTargets = [
    { binary: 'reststudio-linux_x64', output: 'RestStudio-Linux-x64' },
    { binary: 'reststudio-linux_arm64', output: 'RestStudio-Linux-ARM64' },
    { binary: 'reststudio-linux_armhf', output: 'RestStudio-Linux-ARMhf' },
  ];

  linuxTargets.forEach(({ binary, output }) => {
    const binPath = path.join(distDir, binary);
    if (!fs.existsSync(binPath)) return;

    const outputPath = path.join(distDir, output);
    fs.copyFileSync(binPath, outputPath);
    fs.chmodSync(outputPath, '755');

    const stats = fs.statSync(outputPath);
    console.log(`[Linux Build] Created standalone Linux binary with embedded resources (${(stats.size / (1024 * 1024)).toFixed(2)} MB): ${outputPath}`);
  });
}

// MAIN EXECUTION
const distDir = path.resolve('dist/reststudio');

if (fs.existsSync(distDir)) {
  // Copy neutralino.config.json for standalone binaries
  if (fs.existsSync('neutralino.config.json')) {
    fs.copyFileSync('neutralino.config.json', path.join(distDir, 'neutralino.config.json'));
  }

  // 1. Process Windows Executables
  processWindowsExecutables(distDir);

  // 2. Process Linux Executables
  processLinuxExecutables(distDir);

  // 3. Clean up raw temporary build files in dist/reststudio
  const filesToDelete = [
    'reststudio-win_x64.exe',
    'reststudio-win_x86.exe',
    'reststudio-win_arm64.exe',
    'reststudio-linux_x64',
    'reststudio-linux_arm64',
    'reststudio-linux_armhf',
  ];

  filesToDelete.forEach((file) => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Clean] Removed raw build file: ${file}`);
    }
  });
}
