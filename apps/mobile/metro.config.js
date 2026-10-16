const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

// apps/mobile sits two levels below the workspace root.
// Pattern from the official Expo monorepo guide:
// https://docs.expo.dev/guides/monorepos
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo so edits in packages/*
// trigger Metro rebuilds and Fast Refresh in the mobile app.
config.watchFolders = [monorepoRoot];
// 2. Let Metro resolve packages from the app and the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
