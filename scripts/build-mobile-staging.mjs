// Builds the Android staging APK with the deployed staging endpoints baked in.
//
// EXPO_PUBLIC_* values are inlined into the JS bundle by Metro, so they cannot
// be changed at runtime: the APK always talks to the endpoints resolved here.
// Those endpoints live in apps/mobile/eas.json so the local and EAS builds use
// exactly the same values.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = resolve(repoRoot, "apps/mobile");
const androidDir = resolve(mobileDir, "android");
const apkPath = resolve(androidDir, "app/build/outputs/apk/release/app-release.apk");
const outputPath = resolve(mobileDir, "dist/staging/aqui-suena-staging.apk");
const dryRun = process.argv.includes("--dry-run");

let easConfig;
try {
  easConfig = JSON.parse(readFileSync(resolve(mobileDir, "eas.json"), "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`error: could not read apps/mobile/eas.json: ${message}`);
  process.exit(1);
}
const stagingEnv = easConfig.build?.staging?.env ?? {};

function endpoint(name) {
  const value = process.env[name] || stagingEnv[name];
  if (!value) {
    console.error(
      `error: ${name} is missing from apps/mobile/eas.json (build.staging.env).\n` +
        `       Set it there, or pass ${name}=... to this command.`,
    );
    process.exit(1);
  }
  return value.replace(/\/+$/, "");
}

const apiBaseUrl = endpoint("EXPO_PUBLIC_API_BASE_URL");
const streamBaseUrl = endpoint("EXPO_PUBLIC_STREAM_BASE_URL");

for (const [name, value] of [
  ["EXPO_PUBLIC_API_BASE_URL", apiBaseUrl],
  ["EXPO_PUBLIC_STREAM_BASE_URL", streamBaseUrl],
]) {
  if (!/^https?:\/\//i.test(value) || !URL.canParse(value)) {
    console.error(`error: ${name} must be an absolute http(s) URL: ${value}`);
    process.exit(1);
  }
  if (!/^https:\/\//i.test(value)) {
    console.warn(
      `warning: ${name} is not HTTPS (${value}).\n` +
        "         targetSdk 36 blocks cleartext traffic in release builds.",
    );
  }
}

console.log(`staging API base:    ${apiBaseUrl}`);
console.log(`staging stream base: ${streamBaseUrl}`);

const prebuildArgs = [
  "--filter",
  "mobile",
  "exec",
  "expo",
  "prebuild",
  "--platform",
  "android",
  "--clean",
  "--no-install",
];
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradleArgs = ["assembleRelease"];

if (dryRun) {
  console.log(`\nwould run: pnpm ${prebuildArgs.join(" ")}`);
  console.log(`would run: (cwd apps/mobile/android) ${gradleCommand} ${gradleArgs.join(" ")}`);
  console.log(`would copy: ${apkPath} -> ${outputPath}`);
  process.exit(0);
}

if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  console.error("error: ANDROID_HOME or ANDROID_SDK_ROOT must point at an installed Android SDK.");
  process.exit(1);
}

const env = {
  ...process.env,
  EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
  EXPO_PUBLIC_STREAM_BASE_URL: streamBaseUrl,
};

const prebuild = spawnSync("pnpm", prebuildArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
if (prebuild.status !== 0) process.exit(prebuild.status ?? 1);

const build = spawnSync(gradleCommand, gradleArgs, {
  cwd: androidDir,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
if (build.status !== 0) process.exit(build.status ?? 1);

if (!existsSync(apkPath)) {
  console.error(`error: Gradle finished but the APK is missing: ${apkPath}`);
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });
copyFileSync(apkPath, outputPath);

console.log(`\nstaging APK: ${outputPath}`);
console.log(`install with: adb install -r ${outputPath}`);
