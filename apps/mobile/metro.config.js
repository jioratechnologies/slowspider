// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// apps/mobile is deliberately excluded from the root npm workspaces array (Expo/Metro doesn't
// play well with hoisted workspace node_modules — see docs/MIGRATION-PLAN-bff-kong-split.md),
// so packages/shared-types is pulled in via a plain `file:` dependency instead of workspace
// linking. Metro's default config only watches/resolves within projectRoot, so without the
// settings below it can neither see source changes in ../../packages/shared-types nor resolve
// the package at all once npm symlinks it into node_modules.
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo (not just apps/mobile) so Metro picks up changes made to
//    packages/shared-types's source directly, without needing a rebuild step.
config.watchFolders = [monorepoRoot];

// 2. Resolve node_modules from both apps/mobile's own node_modules and the monorepo root's,
//    in that order — the file: dependency resolves into apps/mobile/node_modules, but this
//    also covers anything hoisted to the root.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules"), path.resolve(monorepoRoot, "node_modules")];

// 3. npm installs `file:` dependencies as symlinks — Metro needs this on to follow the
//    node_modules/@slowspider/shared-types symlink out to packages/shared-types instead of
//    treating it as a broken/opaque path.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
