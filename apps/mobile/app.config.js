const path = require('node:path');
const { execFileSync } = require('node:child_process');

module.exports = ({ config }) => {
  const appEnv = (
    process.env.APP_ENV ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    process.env.EAS_BUILD_PROFILE ||
    'development'
  ).toLowerCase();

  // EAS evaluates this config again in the actual cloud build environment,
  // where EAS_BUILD and EAS-managed environment variables are available.
  // The local EAS CLI may not have access to EAS-managed values, so validation
  // belongs in the real build worker rather than relying on local shell state.
  if (
    (process.env.EAS_BUILD === 'true' || process.env.EAS_BUILD === '1') &&
    ['preview', 'production'].includes(appEnv)
  ) {
    execFileSync(
      process.execPath,
      [path.resolve(__dirname, '../../scripts/verify-mobile-runtime-config.mjs')],
      { stdio: 'inherit' }
    );
  }

  return config;
};
