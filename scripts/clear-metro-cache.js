/**
 * Safely clear Metro's Windows temp cache before start.
 * `react-native start --reset-cache` can crash with ENOTEMPTY on Win32
 * when FileStore.rmdirSync races a non-empty cache dir — leaving Metro
 * dead and the phone on a black/empty native window with no JS.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const temp = os.tmpdir();
const targets = [
  path.join(temp, 'metro-cache'),
  path.join(temp, 'metro-file-map'),
];

for (const dir of fs.readdirSync(temp)) {
  if (dir.startsWith('haste-map-') || dir.startsWith('metro-cache')) {
    targets.push(path.join(temp, dir));
  }
}

for (const target of [...new Set(targets)]) {
  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      console.log('[metro-cache] cleared', target);
    }
  } catch (err) {
    console.warn('[metro-cache] skip', target, err && err.message ? err.message : err);
  }
}
