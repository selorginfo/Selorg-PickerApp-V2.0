# PICKER_BUILD_NOTES.md — Android build

## Status of the quality gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run lint` | **0 errors** (16 cosmetic warnings) |
| Metro JS bundle — `npx react-native bundle --platform android --entry-file index.js` | **OK** (25 assets, all modules resolve) |
| `./gradlew :app:assembleDebug` | Runs **all 139 tasks** — Kotlin/Java compile, manifest merge, resource merge, autolinking (`react-native-svg`, `-screens`, `-gesture-handler`, `-safe-area-context`, `@react-native-async-storage/async-storage`), Hermes bytecode — then fails **only** at `:app:buildCMakeDebug[arm64-v8a]` |

## The blocker — Windows `MAX_PATH` (260), not app code

React Native ≥ 0.76 always builds the New Architecture; ≥ 0.82 **rejects
`newArchEnabled=false`**. The New-Arch build runs Codegen → CMake/ninja for every
native module. On this machine the generated object-file path overflows 260 chars:

```
ninja: error: Stat(.../android/app/.cxx/Debug/<hash>/arm64-v8a/
  safeareacontext_autolinked_build/CMakeFiles/react_codegen_safeareacontext.dir/
  C_/Users/lmbac/Desktop/Selorg_V1.3/Selorg_PickerApp_V1.3/
  node_modules/react-native-safe-area-context/common/cpp/react/renderer/components/
  safeareacontext/RNCSafeAreaViewShadowNode.cpp.o): Filename longer than 260 characters
```

The object name embeds the **canonical project path a second time** (CMake mangles the
out-of-tree codegen source path into the `.o` name). The project sits at
`C:\Users\lmbac\Desktop\Selorg V1.3\Selorg PickerApp V1.3\` (≈ 54 chars),
so the doubled path can still clear 260.

### What does NOT fix it
- `subst X:` / `mklink /J` junction — RN's Gradle plugin `realpath`s the location, so the
  canonical (long) path is still what CMake records.
- `-DCMAKE_OBJECT_PATH_MAX` — only shortens the *relative source* portion; for out-of-tree
  sources CMake keeps the mangled absolute name and merely warns, then ninja still fails.
- `newArchEnabled=false` — rejected by RN ≥ 0.82.

### What fixes it (any one)

**A — Enable Win32 long paths (needs admin, one time):**
```
reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
git config --system core.longpaths true
```
Open a **new** shell, then `cd android && ./gradlew :app:assembleDebug`.

**B — Build from a short real path (no admin):**
```
robocopy "C:\Users\lmbac\Desktop\Selorg V1.3\Selorg PickerApp V1.3" C:\sp /E /XD node_modules
cd /d C:\sp && npm install && cd android && gradlew.bat :app:assembleDebug
```
`C:\sp\…` keeps the doubled path under 260. (This is what was used to verify the build —
see below.)

**C — Keep the checkout short:** clone/create the project at e.g. `C:\src\SelorgPickerApp`
from the start.

## Verification build (fix B) — ✅ SUCCESS

A byte-for-byte copy of the project was placed at `C:\rn`, `npm install`ed, and built:

```
> Task :app:buildCMakeDebug[arm64-v8a]        (New-Arch C++ codegen — the step that
> Task :react-native-gesture-handler:...        fails at the deep original path)
> Task :react-native-screens:...
...
BUILD SUCCESSFUL in 13m 51s
166 actionable tasks: 166 executed
```

Output: **`android/app/build/outputs/apk/debug/app-debug.apk`** — **54 MB**, contains
`classes.dex` (11 MB), `lib/arm64-v8a/libappmodules.so` (5.7 MB — the compiled New-Arch
C++ TurboModule/Fabric codegen for svg / screens / gesture-handler / safe-area /
async-storage), `libhermesvm.so`, `libreactnative.so`, `AndroidManifest.xml`.

The APK is copied into the repo at **`app-debug.apk`**; the full Gradle
log is at **`android-build-success.log`**. The `C:\rn` scratch copy was
deleted after the build.

To install & run:
```
adb install -r app-debug.apk
adb shell monkey -p com.selorgpickerapp -c android.intent.category.LAUNCHER 1
```
(debug builds fetch JS from Metro — run `npx react-native start` first, from a short path).

## Run on device / emulator

```
npx react-native start
npx react-native run-android
```
`android/gradle.properties` is left at the RN default
(`reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`). For faster local
iteration, narrow it to just your device's ABI, e.g.
`./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`.
No source files were modified for the build workaround — `gradle.properties` and
`app/build.gradle` are at their generated defaults; the only native-side change is the
standard react-navigation `MainActivity.onCreate(null)` override.
