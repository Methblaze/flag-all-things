// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const SDK_DIR = `${path.sep}@anthropic-ai${path.sep}sdk${path.sep}`;
const defaultResolve = config.resolver.resolveRequest;

// @anthropic-ai/sdk's ESM build has circular re-exports that Metro evaluates eagerly
// ("Cannot access 'BETA_BROWSER_MEMBER_NAME_VALUES' before initialization"). Its CommonJS
// build uses lazy getters and loads cleanly, so resolve that package with the require condition.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromSdk = moduleName.startsWith('@anthropic-ai/sdk') || context.originModulePath.includes(SDK_DIR);
  const ctx = fromSdk ? { ...context, unstable_conditionNames: ['require', 'default'] } : context;
  return (defaultResolve ?? context.resolveRequest)(ctx, moduleName, platform);
};

module.exports = config;
