const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Archived Expo tree under `_source` must stay out of the haste map —
  // crawling it left `_resolutionCache` undefined and crashed bundling.
  resolver: {
    // Archived Expo tree under `_source` must stay out of the haste map.
    // Also ignore native android/build trees — corrupt Windows paths crash Metro watcher.
    blockList: exclusionList([
      /[/\\]_source[/\\].*/,
      /node_modules[/\\].*[/\\]android[/\\]build[/\\].*/,
      /node_modules[/\\].*[/\\]android[/\\]\.cxx[/\\].*/,
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
