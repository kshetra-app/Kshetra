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



// 4. Custom resolver for '@/' and monorepo packages
const metroResolver = require('metro-resolver');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const subPath = moduleName.slice(2);
    const resolvedPath = path.resolve(projectRoot, subPath);
    return metroResolver.resolve(context, resolvedPath, platform);
  }
  if (moduleName === '@kshetra/shared') {
    const resolvedPath = path.resolve(monorepoRoot, 'packages/shared/src');
    return metroResolver.resolve(context, resolvedPath, platform);
  }
  return metroResolver.resolve(context, moduleName, platform);
};

// 5. Bundle the prebuilt SQLite seed database as an asset so it can be
//    require()'d and copied into the SQLite directory on first launch.
if (!config.resolver.assetExts.includes('db')) {
  config.resolver.assetExts.push('db');
}

module.exports = config;
