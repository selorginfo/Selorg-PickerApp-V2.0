/**
 * Tunnel device localhost → this PC for Metro (8081) and selorg-service (3333).
 * Required for USB and wireless ADB so the app can use 127.0.0.1 without
 * depending on Windows firewall allowing LAN:3333.
 *
 * Also refreshes local .env DEV_API_HOST (LAN IP) for Wi‑Fi fallback when
 * reverse for :3333 is dropped (common after wireless ADB reconnect).
 */
const { execFileSync } = require('child_process');

require('./ensure-dev-api-env');

const PORTS = ['3333', '8081'];

function deviceIds() {
  try {
    const out = execFileSync('adb', ['devices'], { encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .slice(1)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*') && /\sdevice$/.test(line))
      .map(line => line.split(/\s+/)[0]);
  } catch {
    return [];
  }
}

function reverseList(id) {
  try {
    return execFileSync('adb', ['-s', id, 'reverse', '--list'], {
      encoding: 'utf8',
    });
  } catch {
    return '';
  }
}

const ids = deviceIds();
if (!ids.length) {
  console.warn('[adb-reverse-api] No Android devices connected — skip reverse.');
  process.exit(0);
}

let failed = 0;
for (const id of ids) {
  for (const port of PORTS) {
    try {
      execFileSync('adb', ['-s', id, 'reverse', `tcp:${port}`, `tcp:${port}`], {
        stdio: 'inherit',
      });
    } catch {
      console.warn(`[adb-reverse-api] reverse tcp:${port} failed on ${id}`);
      failed += 1;
    }
  }
  const list = reverseList(id);
  const ok3333 = /tcp:3333/.test(list);
  const ok8081 = /tcp:8081/.test(list);
  console.log(
    `[adb-reverse-api] ${id}: 3333=${ok3333 ? 'ok' : 'MISSING'} 8081=${ok8081 ? 'ok' : 'MISSING'}`,
  );
  if (!ok3333 || !ok8081) failed += 1;
}

if (failed) {
  console.warn(
    '[adb-reverse-api] Incomplete reverse — physical devices will use DEV_API_HOST (LAN IP) from .env instead of 127.0.0.1.',
  );
}
