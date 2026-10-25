const path = require('path');

// Expo Router v6's Babel preset integration should inline this variable, but
// this monorepo's custom Babel resolver has produced Metro require.context
// failures. Match Expo Router's documented relative-to-entry root semantics
// and make the runtime argument a literal at transform time.
const routerEntry = require.resolve('expo-router/entry');
const routerContextRoot = path.relative(
  path.dirname(routerEntry),
  path.resolve(__dirname, 'app'),
);
function inlineExpoRouterAppRoot({ types: t }) {
  return {
    name: 'kshetra-inline-expo-router-app-root',
    visitor: {
      MemberExpression(p) {
        const node = p.node;
        if (
          node.computed ||
          node.property.type !== 'Identifier' ||
          node.property.name !== 'EXPO_ROUTER_APP_ROOT' ||
          node.object.type !== 'MemberExpression' ||
          node.object.computed ||
          node.object.property.type !== 'Identifier' ||
          node.object.property.name !== 'env' ||
          node.object.object.type !== 'Identifier' ||
          node.object.object.name !== 'process'
        ) return;
        p.replaceWith(t.stringLiteral(routerContextRoot));
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      inlineExpoRouterAppRoot,
      [
        'module-resolver',
        {
          root: [path.resolve(__dirname, '.')],
          alias: {
            '@': path.resolve(__dirname, '.'),
            '@kshetra/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
