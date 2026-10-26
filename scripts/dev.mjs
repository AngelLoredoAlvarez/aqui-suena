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
// Pass --mobile-only to start only Metro (with LAN IP injection) without
// api/web/desktop — use when those are already running manually.
//
// Ctrl-C stops the whole group. Pass --android to open the app on a running
// emulator or device once Metro is up.
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The emulator is opt-in: pass --android (open the app on it) or --emulator
// (start it only). Launch it manually otherwise.
const emulatorOnly = process.argv.includes("--emulator");
const mobileOnly = process.argv.includes("--mobile-only");
const startEmulator = process.argv.includes("--android") || emulatorOnly;
const openAndroid = process.argv.includes("--android") || emulatorOnly;
// (services are spawned directly from their package binaries; pnpm is no longer
// used as a wrapper, which avoids its failure banners on shutdown)

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
    port: 3001,
    cmd: "tsx",
    args: ["watch", "src/main.ts"],
    cwd: "packages/api",
    env: {},
  },
  {
    name: "web",
    port: 3000,
    cmd: "next",
    args: ["dev"],
    cwd: "apps/web",
    // Pin the port so an injected PORT (e.g. 3001 from Infisical) does not
    // make Next.js clash with the API on :3001.
    env: { PORT: "3000" },
  },
  {
    name: "mobile",
    port: 8081,
    cmd: "expo",
    args: ["start", ...(openAndroid ? ["--android"] : [])],
    cwd: "apps/mobile",
    env: { EXPO_PUBLIC_STREAM_BASE_URL: streamBase },
  },
  {
    name: "desktop",
    port: null,
    cmd: "tauri",
    args: ["dev", "--config", tauriConfig],
    cwd: "apps/desktop",
    env: {},
  },
].filter((task) => !mobileOnly || task.name === "mobile");

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
    // Escalate to SIGKILL if SIGTERM did not finish promptly, so a single
    // Ctrl+C actually stops everything instead of leaving processes alive.
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          try {
            child.kill("SIGKILL");
          } catch {
            // already gone
          }
        }
      }
    }, 500).unref();
  }
  process.exitCode = code;
  // Do not hang forever on a process that ignores SIGTERM.
  setTimeout(() => process.exit(code), 1500).unref();
}

let shuttingDown = false;

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function probePortOnce(port, host = "127.0.0.1", timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

// A service that is still starting up may not accept connections on the first
// probe. Retry a couple of times so a just-launched instance is not mistaken
// for "not running" (which would spawn a duplicate and crash on the port).
async function isPortOpen(port, host = "127.0.0.1", timeout = 500, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (await probePortOnce(port, host, timeout)) {
      return true;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return false;
}

if (mobileOnly) {
  console.log(`[dev] mobile-only: Metro on :8081, fixtures at ${streamBase}`);
  console.log("[dev] api/web/desktop NOT started (start them manually if needed)");
  console.log("[dev] Ctrl-C stops Metro\n");
} else {
  console.log("[dev] api      http://localhost:3001");
  console.log("[dev] web      http://localhost:3000");
  console.log(`[dev] mobile   Metro on :8081, fixtures at ${streamBase}`);
  console.log("[dev] desktop  Tauri dev window against :3000");
  console.log("[dev] Ctrl-C stops everything\n");
}

const reused = [];
const toStart = [];

for (const task of tasks) {
  if (task.name === "desktop" && (await isPortOpen(3000))) {
    reused.push(task);
    console.log("[dev] desktop: web already running; reusing (no second Tauri window)");
    continue;
  }
  if (task.port && (await isPortOpen(task.port))) {
    reused.push(task);
    console.log(`[dev] ${task.name} already running on :${task.port}; reusing (not restarted)`);
  } else {
    toStart.push(task);
  }
}

function resolveBin(name, pkgDir) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  const candidates = [
    join(root, pkgDir, "node_modules", ".bin", name + suffix),
    join(root, "node_modules", ".bin", name + suffix),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return name;
}

const binPathEnv = [
  join(root, "node_modules", ".bin"),
  ...tasks.map((task) => join(root, task.cwd, "node_modules", ".bin")),
].join(process.platform === "win32" ? ";" : ":");

for (const task of toStart) {
  const child = spawn(resolveBin(task.cmd, task.cwd), task.args, {
    cwd: join(root, task.cwd),
    // Pipe stdout/stderr so we can drop any noisy failure banners, while
    // keeping real build/runtime logs visible.
    stdio: ["inherit", "pipe", "pipe"],
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      ...task.env,
      PATH: `${binPathEnv}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}`,
    },
  });

  const forward = (stream, out) => {
    let buffer = "";
    const drop = (line) =>
      /ERR_PNPM|ELIFECYCLE|failed in/.test(line);

    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (drop(line)) continue;
        out.write(line + "\\n");
      }
    });
    stream.on("end", () => {
      if (!buffer) return;
      for (const line of buffer.split("\\n")) {
        if (line && !drop(line)) out.write(line + "\\n");
      }
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

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
    if (task.port) {
      isPortOpen(task.port).then((open) => {
        if (open) {
          console.error(`\n[dev] ${task.name} exited (${signal ?? code}) but :${task.port} is still serving; continuing`);
          return;
        }
        console.error(`\n[dev] ${task.name} exited (${signal ?? code}); stopping the rest`);
        shutdown(code ?? 1);
      });
      return;
    }
    console.error(`\n[dev] ${task.name} exited (${signal ?? code}); stopping the rest`);
    shutdown(code ?? 1);
  });
}

if (reused.length > 0) {
  console.log(`[dev] reused: ${reused.map((task) => task.name).join(", ")}\n`);
}

if (children.size === 0 && reused.length > 0) {
  console.log("[dev] all requested services already running; nothing to start.");
  console.log("[dev] (the already-running instance owns them; Ctrl-C there to stop everything)\n");
  process.exit(0);
}
