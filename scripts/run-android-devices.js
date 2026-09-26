/**
 * Install + launch on each connected device separately.
 * `gradlew installDebug` against USB + wireless ADB together hangs with
 * ShellCommandUnresponsiveException, which left the emulator with no picker UI.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('./ensure-dev-api-env');
require('./adb-reverse-api');

const root = path.resolve(__dirname, '..');
const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const gradlew = path.join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const pkg = 'com.selorgpickerapp';
const activity = `${pkg}/.MainActivity`;

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

const extra = process.argv.slice(2);
let only = null;
const flag = extra.findIndex(a => a === '--deviceId' || a === '--device');
if (flag >= 0) only = extra[flag + 1];
const eq = extra.find(a => a.startsWith('--deviceId='));
if (eq) only = eq.split('=')[1];
if (process.env.ANDROID_SERIAL) only = only || process.env.ANDROID_SERIAL;

const devices = only ? [only] : deviceIds();
if (!devices.length) {
  console.error('No Android devices connected.');
  process.exit(1);
}

const assemble = spawnSync(
  `"${gradlew}"`,
  ['assembleDebug', '-PreactNativeArchitectures=arm64-v8a,x86_64'],
  {
    cwd: path.join(root, 'android'),
    stdio: 'inherit',
    shell: true,
  },
);
if (assemble.status !== 0) process.exit(assemble.status || 1);
if (!fs.existsSync(apk)) {
  console.error('APK missing:', apk);
  process.exit(1);
}

let failed = 0;
for (const id of devices) {
  console.log(`\nInstalling Selorg Picker on ${id}`);
  // Quote APK path: Windows shell:true splits on spaces in "Selorg Ai".
  const ins = spawnSync('adb', ['-s', id, 'install', '-r', '-t', `"${apk}"`], {
    stdio: 'inherit',
    shell: true,
  });
  if (ins.status !== 0) {
    console.warn(`install failed on ${id}`);
    failed += 1;
    continue;
  }
  spawnSync('adb', ['-s', id, 'shell', 'am', 'force-stop', pkg], { stdio: 'inherit', shell: true });
  spawnSync('adb', ['-s', id, 'shell', 'am', 'start', '-n', activity], { stdio: 'inherit', shell: true });
}

require('./adb-reverse-api');
process.exit(failed && failed === devices.length ? 1 : 0);
