module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      './babel-plugin-expo-router-root',
      [
        'transform-inline-environment-variables',
        {
          include: [
            'EXPO_ROUTER_IMPORT_MODE',
          ],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
