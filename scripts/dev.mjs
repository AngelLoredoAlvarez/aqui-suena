#!/usr/bin/env node
import "./with-infisical.mjs";
// Boots everything the three clients need in development:
//
//   api      http://localhost:3001  shared backend: tRPC router + /stream proxy
//   web      http://localhost:3000  Next.js, also serves /test-streams fixtures
//   mobile   Metro on :8081         fixtures loaded from the web dev server
//   desktop  Tauri window           reuses :3000 instead of starting a second one
//
// Ctrl-C stops the whole group. Pass --android to open the app on a running
// emulator or device once Metro is up.
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openAndroid = process.argv.includes("--android");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

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

const children = new Set();
let shuttingDown = false;

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
  if (!shuttingDown) {
    shuttingDown = true;
    for (const child of children) {
      killTree(child);
    }
    process.exitCode = code;
    // Do not hang forever on a process that ignores SIGTERM.
    setTimeout(() => process.exit(code), 4000).unref();
  }
}

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
