/**
 * Custom Babel plugin that replaces process.env.EXPO_ROUTER_APP_ROOT
 * with the relative path to the app/ directory from the file requiring it,
 * and inlines process.env.EXPO_ROUTER_IMPORT_MODE.
 * 
 * Metro's require.context implementation uses:
 *   path.join(parentPath, "..", dep.name)
 * When dep.name is an absolute Windows path (e.g. C:\Users\...), Node's path.join
 * concatenates it as "parentPath\..\C:\Users\...", resulting in an invalid path
 * where Metro finds 0 files, generates metroEmptyContext, and throws "No routes found".
 * 
 * By using a canonicalized relative path (e.g. "../../app"), path.join resolves
 * cleanly to the actual app directory on all platforms including Windows.
 */
const path = require('path');
const fs = require('fs');

module.exports = function ({ types: t }) {
  const appRoot = path.resolve(__dirname, 'app');

  return {
    name: 'expo-router-root',
    visitor: {
      MemberExpression(nodePath, state) {
        if (
          nodePath.matchesPattern('process.env.EXPO_ROUTER_APP_ROOT')
        ) {
          const currentFile = state.filename || (state.file && state.file.opts && state.file.opts.filename);
          let relativePath = '../../app';
          if (currentFile) {
            let realCurrent = currentFile;
            let realApp = appRoot;
            try { realCurrent = fs.realpathSync(realCurrent); } catch {}
            try { realApp = fs.realpathSync(realApp); } catch {}
            let rel = path.relative(path.dirname(realCurrent), realApp).replace(/\\/g, '/');
            if (!rel.startsWith('.')) {
              rel = './' + rel;
            }
            relativePath = rel;
          }
          nodePath.replaceWith(t.stringLiteral(relativePath));
        }
        if (
          nodePath.matchesPattern('process.env.EXPO_ROUTER_IMPORT_MODE')
        ) {
          nodePath.replaceWith(t.stringLiteral(process.env.EXPO_ROUTER_IMPORT_MODE || 'sync'));
        }
      },
    },
  };
};
