// npm only packs files inside this directory, so copy the repository's
// LICENSE and EULA next to package.json before `npm pack` / `npm publish`.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..', '..');
for (const name of ['LICENSE', 'EULA.md']) {
  const from = path.join(root, name);
  const to = path.join(__dirname, '..', name);
  if (!fs.existsSync(from)) {
    console.error(`[closiro] ${name} not found at ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
}
