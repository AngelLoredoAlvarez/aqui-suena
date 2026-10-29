#!/usr/bin/env node
// Boots everything the three clients need in development:
//
//   api      http://localhost:3001  shared backend: tRPC router + /stream proxy
//   web      http://localhost:3000  Next.js, also serves /test-streams fixtures
//   mobile   Metro on :8081         fixtures loaded from the web dev server
//   desktop  Tauri window           reuses :3000 instead of starting a second one
//
// Pass --android to open the app on a running emulator (starts Pixel_7 if
// needed), including when Metro is already up and gets reused.
// Pass --emulator to only start the emulator without opening the app.
// Pass --mobile-only to start only Metro (with LAN IP injection) without
// api/web/desktop — use when those are already running manually.
//
// Ctrl-C stops the whole group. Pass --android to open the app on a running
// emulator or device once Metro is up.
//
// Running the file boots the group; importing it only exposes the helpers below,
// which scripts/dev.test.mjs exercises without touching a single port.
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { maybeReexecUnderInfisical } from "./with-infisical.mjs";

const here = fileURLToPath(import.meta.url);
const root = resolve(dirname(here), "..");

// The emulator is opt-in. --android and --emulator differ in exactly one thing:
// whether the app is launched once Metro is up.
export function parseFlags(argv) {
  const launchApp = argv.includes("--android");
  const emulatorOnly = argv.includes("--emulator");
  return {
    launchApp,
    emulatorOnly,
    mobileOnly: argv.includes("--mobile-only"),
    startEmulator: launchApp || emulatorOnly,
  };
}

// Resolve the list of AVDs to boot/open. An explicit ANDROID_AVD always wins:
//   "*"            -> every AVD the emulator knows about (N emulators at once)
//   "A,B"          -> that explicit (comma-separated) subset
//   "A"            -> just that one
// otherwise auto-detect: a single AVD is used directly; with several and no
// choice we return [] so the caller reports the ambiguity instead of guessing.
export function resolveAvds(env = process.env, available = null) {
  const raw = env.ANDROID_AVD;
  if (raw) {
    if (raw === "*") {
      return Array.isArray(available) ? [...available] : [];
    }
    return raw
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(available)) return [];
  if (available.length === 1) return [available[0]];
  return [];
}

// Backwards-compatible single-AVD resolver kept for callers/tests that expect
// one name or null.
export function avdName(env = process.env, available = null) {
  const avds = resolveAvds(env, available);
  return avds.length === 1 ? avds[0] : (avds.length === 0 ? null : avds[0] ?? null);
}

// Ask the emulator binary which AVDs it knows about. A missing binary or a
// failure to list them yields an empty list, which the caller treats as "none".
export function listAvds(
  emulatorBin,
  run = (bin, args) =>
    execFileSync(bin, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
) {
  if (!emulatorBin) return [];
  try {
    const output = run(emulatorBin, ["-list-avds"]);
    return String(output ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function lanAddress(interfaces = networkInterfaces()) {
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "localhost";
}

// A usable device is a serial followed by the word `device`; `offline` and
// `unauthorized` leave nothing to open the app on.
export function parseAdbDevices(output) {
  return /emulator-\d+\s+device/.test(output ?? "");
}

// List the serials of every attached, ready device so the app can be opened on
// N emulators instead of just the first one.
export function listAdbDevices(output) {
  return String(output ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\sdevice$/.test(line))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

// `expo start --android` opens the app only while it owns Metro's startup. When
// Metro is reused, that flag never reaches it, so open the app over adb: reverse
// the packager port and deep-link Expo Go to the server already listening.
// When a device serial is given, target that specific emulator (-s <serial>)
// so N emulators can be opened independently.
export function androidLaunchCommands(deviceSerial = null) {
  const prefix = deviceSerial ? ["-s", deviceSerial] : [];
  return [
    [...prefix, "reverse", "tcp:8081", "tcp:8081"],
    [...prefix, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "exp://127.0.0.1:8081"],
  ];
}

export function openAppOnEmulator({ deviceAttached, run, log = console, deviceSerial = null }) {
  if (!deviceAttached) {
    log.error("[dev] no emulator attached; not opening the app");
    return false;
  }
  try {
    for (const args of androidLaunchCommands(deviceSerial)) {
      run(args);
    }
    log.log(
      deviceSerial
        ? `[dev] opened the app on emulator ${deviceSerial} via Expo Go`
        : "[dev] opened the app on the emulator via Expo Go",
    );
    return true;
  } catch (error) {
    log.error(
      deviceSerial
        ? `[dev] could not open the app on emulator ${deviceSerial}: ${error.message}`
        : `[dev] could not open the app on the emulator: ${error.message}`,
    );
    return false;
  }
}

export function buildTasks({ launchApp, mobileOnly, streamBase, tauriConfig }) {
  return [
    {
      name: "api",
      port: 3001,
      cmd: "tsx",
      args: ["watch", "src/server/main.ts"],
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
      args: ["start", ...(launchApp ? ["--android"] : [])],
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
}

// Mobile is the only task that opens the app, and only when the flag was asked
// for and expo never received it (it was reused instead of started here).
export function needsExternalLaunch({ launchApp, reused }) {
  return launchApp && reused.some((task) => task.name === "mobile");
}

export async function selectReusable(tasks, isOpen) {
  const reused = [];
  const toStart = [];
  for (const task of tasks) {
    if (task.name === "desktop" && (await isOpen(3000))) {
      reused.push(task);
    } else if (task.port && (await isOpen(task.port))) {
      reused.push(task);
    } else {
      toStart.push(task);
    }
  }
  return { reused, toStart };
}

export function resolveBin(name, cwd, repoRoot = root) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  const candidates = [
    join(repoRoot, cwd, "node_modules", ".bin", name + suffix),
    join(repoRoot, "node_modules", ".bin", name + suffix),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return name;
}

// A service that is still starting up may not accept connections on the first
// probe. Retry a couple of times so a just-launched instance is not mistaken
// for "not running" (which would spawn a duplicate and crash on the port).
export function probePortOnce(port, host = "127.0.0.1", timeout = 500) {
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

export async function isPortOpen(port, host = "127.0.0.1", timeout = 500, retries = 2) {
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

// Piped child output arrives in arbitrary chunks, so hold the tail until its
// newline shows up. Lines matching the noisy pnpm failure banners are dropped;
// everything else is re-emitted as one complete line.
export function createLineForwarder(
  out,
  drop = (line) => /ERR_PNPM|ELIFECYCLE|failed in/.test(line),
) {
  let buffer = "";
  return {
    push(chunk) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (drop(line)) continue;
        out.write(`${line}\n`);
      }
    },
    end() {
      if (!buffer) return;
      for (const line of buffer.split("\n")) {
        if (line && !drop(line)) out.write(`${line}\n`);
      }
      buffer = "";
    },
  };
}

async function main() {
  maybeReexecUnderInfisical();

  const { launchApp, mobileOnly, startEmulator } = parseFlags(process.argv);
  const children = new Set();

  // Native plays the fixture URLs directly, so they must be absolute and reachable
  // from the emulator or the phone: the host's LAN address, not localhost.
  const streamBase = process.env.EXPO_PUBLIC_STREAM_BASE_URL || `http://${lanAddress()}:3000`;

  // Shared by the emulator bootstrap and by opening the app on an emulator that
  // was already running, which is the case whenever Metro gets reused.
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

  // Resolve the AVD(s) before anything else. ANDROID_AVD="*" means "all of them",
  // so N emulators can be booted/opened in one invocation. With several AVDs
  // and no choice we stop instead of guessing, so the script stays
  // machine-agnostic.
  const availableAvds = listAvds(emulatorBin);
  const avds = resolveAvds(process.env, availableAvds);

  if (startEmulator && avds.length === 0) {
    if (availableAvds.length === 0) {
      console.error(
        "[dev] no Android emulator (AVD) found. Create one with Android Studio or `avdmanager`, then run again.",
      );
    } else if (process.env.ANDROID_AVD && process.env.ANDROID_AVD !== "*") {
      console.error(
        `[dev] ANDROID_AVD=${process.env.ANDROID_AVD} is not among the available AVDs: ${availableAvds.join(", ")}`,
      );
    } else if (process.env.ANDROID_AVD === "*") {
      console.error("[dev] ANDROID_AVD=* but no AVDs are available.");
    } else {
      console.error(
        `[dev] several AVDs found (${availableAvds.join(", ")}); set ANDROID_AVD to pick one (or "*" for all).`,
      );
    }
    process.exit(1);
  }

  // Start the Android emulator(s) if requested. Each requested AVD is booted
  // in turn. We cannot map a running emulator back to its AVD via adb, so we
  // always attempt to boot and treat an early process exit as "already running"
  // (non-fatal): this is what lets a second terminal target a different
  // emulator while the first keeps running. Errors are logged per AVD and never
  // abort the whole run.
  if (startEmulator) {
    for (const avd of avds) {
      const beforeCount = listAdbDevices(adbDevices()).length;
      if (emulatorBin && existsSync(emulatorBin)) {
        console.log(`[dev] starting emulator ${avd} (this can take ~30s)...`);
        const emulatorChild = spawn(emulatorBin, ["-avd", avd], {
          stdio: "ignore",
          detached: true,
        });
        emulatorChild.unref();
        children.add(emulatorChild);

        let exited = false;
        emulatorChild.on("exit", () => {
          exited = true;
        });

        const deadline = Date.now() + 120000;
        let ready = false;
        while (Date.now() < deadline && !ready && !exited) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const now = listAdbDevices(adbDevices());
          if (now.length > beforeCount) {
            ready = true;
          }
        }
        if (ready) {
          console.log(`[dev] emulator ${avd} ready`);
        } else if (exited) {
          console.log(`[dev] emulator ${avd} already running or exited; continuing`);
        } else {
          console.error("[dev] emulator did not become ready within 120s; continuing anyway");
        }
      } else {
        console.error("[dev] emulator binary not found (ANDROID_HOME/ANDROID_SDK_ROOT); skipping");
      }
    }
  }

  const tasks = buildTasks({
    launchApp,
    mobileOnly,
    streamBase,
    // The desktop window loads the web dev server that this script already owns.
    // Leaving beforeDevCommand in place would try to bind :3000 a second time.
    tauriConfig: JSON.stringify({ build: { beforeDevCommand: "" } }),
  });

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

  let shuttingDown = false;

  function shutdown(code) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    try {
      for (const child of children) {
        try {
          killTree(child);
        } catch {
          // ignore per-child failures
        }
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
    } finally {
      process.exitCode = code;
      setTimeout(() => process.exit(code), 1000);
    }
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

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

  const { reused, toStart } = await selectReusable(tasks, isPortOpen);

  for (const task of reused) {
    console.log(
      task.name === "desktop"
        ? "[dev] desktop: web already running; reusing (no second Tauri window)"
        : `[dev] ${task.name} already running on :${task.port}; reusing (not restarted)`,
    );
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
      const forwarder = createLineForwarder(out);
      stream.on("data", (chunk) => forwarder.push(chunk));
      stream.on("end", () => forwarder.end());
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
            console.error(
              `\n[dev] ${task.name} exited (${signal ?? code}) but :${task.port} is still serving; continuing`,
            );
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

  // Open the app on every attached emulator. When Metro was reused (second
  // terminal) this is the only way the app gets opened; when Metro is fresh,
  // expo --android already opens on one device and the calls below are
  // idempotent, so they also cover the remaining emulators for ANDROID_AVD=*.
  if (launchApp) {
    const devices = listAdbDevices(adbDevices());
    if (devices.length === 0) {
      openAppOnEmulator({
        deviceAttached: false,
        run: (args) => execFileSync(adbBin, args, { stdio: "ignore" }),
        log: console,
      });
    } else {
      for (const serial of devices) {
        openAppOnEmulator({
          deviceAttached: true,
          run: (args) => execFileSync(adbBin, args, { stdio: "ignore" }),
          log: console,
          deviceSerial: serial,
        });
      }
    }
  }

  if (children.size === 0 && reused.length > 0) {
    console.log("[dev] all requested services already running; nothing to start.");
    console.log(
      "[dev] (the already-running instance owns them; Ctrl-C there to stop everything)\n",
    );
    process.exit(0);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === here) {
  await main();
}
