/**
 * Font linking. Drop the .ttf files listed in
 * PICKER_ARCHITECTURE.md § Assets into src/assets/fonts/ then run:
 *   npx react-native-asset
 * (or `npx react-native link` on older CLIs). Until the .ttf files are present
 * the app falls back to the system font — see src/theme/typography.ts.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts/'],
};
