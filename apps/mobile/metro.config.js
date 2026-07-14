const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (official Expo monorepo pattern)
config.watchFolders = [monorepoRoot];

// 2. Resolve packages from both mobile's and root's node_modules
//    (npm workspaces hoists most packages to root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force server root to monorepo root for correct entry-file resolution
//    (projectRoot causes double-prefix: ./apps/mobile/node_modules/...)
if (config.server) {
  config.server.unstable_serverRoot = monorepoRoot;
}

// 4. Bundle the prebuilt SQLite seed database as an asset so it can be
//    require()'d and copied into the SQLite directory on first launch.
if (!config.resolver.assetExts.includes('db')) {
  config.resolver.assetExts.push('db');
}

module.exports = config;
