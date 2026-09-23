/**
 * Tunnel device localhost:3333 → this PC's selorg-service.
 * Required for physical phones (USB or wireless ADB) so Send OTP does not
 * depend on Windows firewall allowing LAN:3333.
 */
const { execSync } = require('child_process');

function deviceIds() {
  try {
    const out = execSync('adb devices', { encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .slice(1)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*') && line.endsWith('device'))
      .map(line => line.split(/\s+/)[0]);
  } catch {
    return [];
  }
}

for (const id of deviceIds()) {
  for (const port of ['3333', '8081']) {
    try {
      execSync(`adb -s "${id}" reverse tcp:${port} tcp:${port}`, { stdio: 'inherit' });
    } catch {
      // Device may have disconnected; keep going.
    }
  }
}
