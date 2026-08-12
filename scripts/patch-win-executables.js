import fs from 'fs';
import path from 'path';

/**
 * Processes Windows executables generated with Neutralino's --embed-resources mode.
 * The generated reststudio-win_x64.exe already contains all web assets embedded directly.
 */
function processWindowsExecutables(distDir) {
  const winExePath = path.join(distDir, 'reststudio-win_x64.exe');

  if (!fs.existsSync(winExePath)) {
    console.warn('[Win Build] Windows binary reststudio-win_x64.exe missing.');
    return;
  }

  try {
    const finalWinExePath = path.join(distDir, 'RestStudio-Windows-x64.exe');
    fs.copyFileSync(winExePath, finalWinExePath);

    const exeStats = fs.statSync(finalWinExePath);
    console.log(`[Win Build] Created standalone Windows executable (${(exeStats.size / (1024 * 1024)).toFixed(2)} MB): ${finalWinExePath}`);
  } catch (err) {
    console.warn('[Win Build] Error copying Windows executable:', err.message);
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
    'RestStudio.exe',
  ];

  filesToDelete.forEach((file) => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Clean] Removed raw build file: ${file}`);
    }
  });

  const redundantDir = path.join(distDir, 'RestStudio-Windows-x64');
  if (fs.existsSync(redundantDir)) {
    fs.rmSync(redundantDir, { recursive: true, force: true });
    console.log(`[Clean] Removed redundant directory: RestStudio-Windows-x64`);
  }
}
