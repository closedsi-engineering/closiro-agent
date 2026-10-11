// Downloads the native binary for this platform from GitHub Releases,
// verifies it against the release checksums, and unpacks it into bin/.
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const env = (name) => process.env[`CLOSIRO_${name}`] || process.env[`SNAILER_${name}`];

if (env('SKIP_POSTINSTALL') === '1') {
  console.log('[closiro] Skipping binary download (CLOSIRO_SKIP_POSTINSTALL=1).');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const repoSlug = env('REPO') && env('REPO').includes('/')
  ? env('REPO')
  : `${env('ORG') || 'closedsi-engineering'}/${env('REPO') || 'closiro-agent'}`;
const version = 'v' + (process.env.npm_package_version || pkg.version);

// Rust target triples used in the released archive names.
const TRIPLES = {
  'darwin-arm64': 'aarch64-apple-darwin',
  'darwin-x64': 'x86_64-apple-darwin',
  'linux-x64': 'x86_64-unknown-linux-musl',
  'win32-x64': 'x86_64-pc-windows-msvc',
};
const key = `${os.platform()}-${os.arch()}`;
const triple = TRIPLES[key];
if (!triple) {
  console.error(`[closiro] No prebuilt binary for ${key}.`);
  console.error(`[closiro] Available: ${Object.keys(TRIPLES).join(', ')}`);
  process.exit(1);
}

const isWin = os.platform() === 'win32';
const asset = `snailer-${version}-${triple}.${isWin ? 'zip' : 'tar.gz'}`;
const base = `https://github.com/${repoSlug}/releases/download/${version}`;
const url = `${base}/${asset}`;
const sumsUrl = `${base}/snailer-${version}-checksums.txt`;

const binDir = path.join(__dirname, '..', 'bin');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closiro-'));
const archive = path.join(tmpDir, asset);
const sums = path.join(tmpDir, 'checksums.txt');

function download(from, to) {
  if (isWin) {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '${from}' -OutFile '${to}'`],
      { stdio: 'inherit' });
  } else {
    execFileSync('curl', ['-fsSL', '--retry', '3', '-o', to, from], { stdio: 'inherit' });
  }
}

try {
  download(url, archive);
  download(sumsUrl, sums);

  const expected = fs.readFileSync(sums, 'utf8').split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find(([, name]) => name && path.basename(name) === asset);
  if (!expected) throw new Error(`${asset} is not listed in the release checksums`);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  if (actual !== expected[0]) throw new Error(`checksum mismatch for ${asset}`);

  fs.mkdirSync(binDir, { recursive: true });
  if (isWin) {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${binDir}' -Force`], { stdio: 'inherit' });
  } else {
    execFileSync('tar', ['-xzf', archive, '-C', binDir], { stdio: 'inherit' });
    fs.chmodSync(path.join(binDir, 'snailer'), 0o755);
  }
  console.log(`[closiro] Installed ${version} (${triple}). Run: closiro --help`);
  console.log(`[closiro] By installing, you agree to the EULA: https://github.com/${repoSlug}/blob/main/EULA.md`);
} catch (e) {
  console.error(`[closiro] Failed to install the binary: ${e.message}`);
  console.error(`[closiro] Manual download: ${url}`);
  process.exit(1);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
