/**
 * Custom Babel plugin that replaces process.env.EXPO_ROUTER_APP_ROOT
 * with the absolute path to the app/ directory at build time.
 * 
 * This solves the monorepo problem where the env var value gets inlined
 * into node_modules/expo-router/_ctx.android.js and must resolve relative
 * to THAT file — but we don't know where expo-router is installed.
 * 
 * By using an absolute path, require.context always finds the right directory.
 */
const path = require('path');

module.exports = function ({ types: t }) {
  const appRoot = path.resolve(__dirname, 'app');

  return {
    name: 'expo-router-root',
    visitor: {
      MemberExpression(nodePath, state) {
        if (
          nodePath.matchesPattern('process.env.EXPO_ROUTER_APP_ROOT')
        ) {
          nodePath.replaceWith(t.stringLiteral(appRoot));
        }
      },
    },
  };
};
