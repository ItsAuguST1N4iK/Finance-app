module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must be last — Reanimated 4 worklets transform
    plugins: ['react-native-worklets/plugin'],
  };
};
