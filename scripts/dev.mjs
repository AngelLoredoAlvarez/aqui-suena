#!/usr/bin/env node
import "./with-infisical.mjs";
// Boots everything the three clients need in development:
//
//   api      http://localhost:3001  shared backend: tRPC router + /stream proxy
//   web      http://localhost:3000  Next.js, also serves /test-streams fixtures
//   mobile   Metro on :8081         fixtures loaded from the web dev server
//   desktop  Tauri window           reuses :3000 instead of starting a second one
//
// Pass --android to open the app on a running emulator (starts Pixel_7 if needed).
// Pass --emulator to only start the emulator without opening the app.
//
// Ctrl-C stops the whole group. Pass --android to open the app on a running
// emulator or device once Metro is up.
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// By default the Pixel_7 emulator boots alongside everything else (the user
// asked for it to come up with `pnpm dev`). Use --no-emulator for web-only dev.
const noEmulator = process.argv.includes("--no-emulator");
const emulatorOnly = process.argv.includes("--emulator");
const startEmulator = !noEmulator;
const openAndroid = process.argv.includes("--android") || (startEmulator && !emulatorOnly);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const children = new Set();

function lanAddress() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "localhost";
}

// Native plays the fixture URLs directly, so they must be absolute and reachable
// from the emulator or the phone: the host's LAN address, not localhost.
const streamBase = process.env.EXPO_PUBLIC_STREAM_BASE_URL || `http://${lanAddress()}:3000`;

// The desktop window loads the web dev server that this script already owns.
// Leaving beforeDevCommand in place would try to bind :3000 a second time.
const tauriConfig = JSON.stringify({ build: { beforeDevCommand: "" } });

// Start the Android emulator (Pixel_7) if requested and not already running.
if (startEmulator) {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const emulatorBin = sdkRoot ? join(sdkRoot, "emulator", "emulator") : null;
  const adbBin = sdkRoot ? join(sdkRoot, "platform-tools", "adb") : "adb";

  function adbDevices() {
    try {
      return execFileSync(adbBin, ["devices"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      return "";
    }
  }

  const alreadyRunning = /emulator-\d+\s+device/.test(adbDevices());

  if (alreadyRunning) {
    console.log("[dev] emulator already running");
  } else if (emulatorBin && existsSync(emulatorBin)) {
    console.log("[dev] starting emulator Pixel_7 (this can take ~30s)...");
    const emulatorChild = spawn(emulatorBin, ["-avd", "Pixel_7"], {
      stdio: "ignore",
      detached: true,
    });
    emulatorChild.unref();
    children.add(emulatorChild);

    const deadline = Date.now() + 120000;
    let ready = false;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (/emulator-\d+\s+device/.test(adbDevices())) {
        ready = true;
        break;
      }
    }
    if (ready) {
      console.log("[dev] emulator Pixel_7 ready");
    } else {
      console.error("[dev] emulator did not become ready within 120s; continuing anyway");
    }
  } else {
    console.error("[dev] emulator binary not found (ANDROID_HOME/ANDROID_SDK_ROOT); skipping");
  }
}

const tasks = [
  {
    name: "api",
    args: ["--filter", "@aqui-suena/api", "dev"],
    env: {},
  },
  {
    name: "web",
    args: ["--filter", "web", "dev"],
    // Pin the port so an injected PORT (e.g. 3001 from Infisical) does not
    // make Next.js clash with the API on :3001.
    env: { PORT: "3000" },
  },
  {
    name: "mobile",
    args: ["--filter", "mobile", "start", ...(openAndroid ? ["--", "--android"] : [])],
    env: { EXPO_PUBLIC_STREAM_BASE_URL: streamBase },
  },
  {
    name: "desktop",
    args: ["--filter", "desktop", "exec", "tauri", "dev", "--config", tauriConfig],
    env: {},
  },
];

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }
  // Each child is its own process group (detached), so this also reaches the
  // grandchild that actually holds the port: pnpm spawns next/tsx/tauri.
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function shutdown(code) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    killTree(child);
  }
  process.exitCode = code;
  // Do not hang forever on a process that ignores SIGTERM.
  setTimeout(() => process.exit(code), 4000).unref();
}

let shuttingDown = false;

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[dev] api      http://localhost:3001");
console.log("[dev] web      http://localhost:3000");
console.log(`[dev] mobile   Metro on :8081, fixtures at ${streamBase}`);
console.log("[dev] desktop  Tauri dev window against :3000");
console.log("[dev] Ctrl-C stops everything\n");

for (const task of tasks) {
  const child = spawn(pnpm, task.args, {
    cwd: root,
    stdio: "inherit",
    detached: process.platform !== "win32",
    env: { ...process.env, ...task.env },
  });

  children.add(child);

  child.on("error", (error) => {
    console.error(`[dev] ${task.name} failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) {
      return;
    }
    console.error(`\n[dev] ${task.name} exited (${signal ?? code}); stopping the rest`);
    shutdown(code ?? 1);
  });
}
