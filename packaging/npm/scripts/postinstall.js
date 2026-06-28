const { execSync } = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

if (process.env.SNAILER_SKIP_POSTINSTALL === '1') {
  console.log('[snailer] Skipping binary download (SNAILER_SKIP_POSTINSTALL=1).');
  process.exit(0);
}

const org = process.env.SNAILER_ORG || 'felixaihub';
const repo = process.env.SNAILER_REPO || 'snailer-cli';
const version = 'v' + (process.env.npm_package_version || '0.1.0');

function triple() {
  const plat = os.platform();
  const arch = os.arch();
  if (plat === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (plat === 'darwin') return 'x86_64-apple-darwin';
  if (plat === 'linux' && arch === 'arm64') return 'aarch64-unknown-linux-musl';
  if (plat === 'linux') return 'x86_64-unknown-linux-musl';
  if (plat === 'win32') return 'x86_64-pc-windows-msvc';
  throw new Error(`Unsupported platform ${plat}/${arch}`);
}

const plat = os.platform();
const isWin = plat === 'win32';
const asset = `snailer-${version}-${triple()}.${isWin ? 'zip' : 'tar.gz'}`;
const url = `https://github.com/${org}/${repo}/releases/download/${version}/${asset}`;

const binDir = path.join(__dirname, '..', 'bin');
fs.mkdirSync(binDir, { recursive: true });
const tmp = path.join(os.tmpdir(), asset);

try {
  if (isWin) {
    execSync(`powershell -NoProfile -Command \"Invoke-WebRequest -Uri '${url}' -OutFile '${tmp}'; Expand-Archive -LiteralPath '${tmp}' -DestinationPath '${binDir}' -Force\"`, { stdio: 'inherit' });
  } else {
    execSync(`curl -L '${url}' -o '${tmp}'`, { stdio: 'inherit' });
    execSync(`tar -xzf '${tmp}' -C '${binDir}'`, { stdio: 'inherit' });
    execSync(`chmod +x '${path.join(binDir, 'snailer')}'`, { stdio: 'inherit' });
  }
  console.log(`[snailer] Installed binary from ${url}`);
  console.log('[snailer] By installing, you agree to the Snailer EULA: https://github.com/felixaihub/snailer-cli/blob/main/EULA.md');
} catch (e) {
  console.error('[snailer] Failed to download/install binary.');
  console.error(`[snailer] Manual download: ${url}`);
  process.exit(1);
}
