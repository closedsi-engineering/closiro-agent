#!/usr/bin/env node
// Runs the native binary that scripts/postinstall.js placed next to this file.
// Both the `closiro` and `snailer` commands point here.
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// v2.38.0+ archives contain `closiro`; older ones contain `snailer`.
const ext = os.platform() === 'win32' ? '.exe' : '';
const bin = ['closiro', 'snailer'].map((n) => path.join(__dirname, n + ext)).find((p) => fs.existsSync(p));

if (!bin) {
  console.error('[closiro] The native binary is missing. Reinstall with:');
  console.error('[closiro]   npm install -g @closedsi/closiro');
  console.error('[closiro] or download it from https://github.com/closedsi-engineering/closiro-agent/releases');
  process.exit(1);
}

const child = spawn(bin, process.argv.slice(2), { stdio: 'inherit' });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => { if (!child.killed) child.kill(sig); });
}
child.on('error', (err) => {
  console.error(`[closiro] Failed to start ${bin}: ${err.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code === null ? 1 : code);
});
