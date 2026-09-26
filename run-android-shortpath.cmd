@echo off
REM Windows ninja fails with "Filename longer than 260 characters" when building
REM from the long OneDrive path. Always build via the short junction C:\sp.
if not exist "C:\sp\package.json" (
  echo Creating junction C:\sp ...
  mklink /J C:\sp "%~dp0."
)
cd /d C:\sp
echo Building from short path: %CD%
call npx react-native run-android %*
