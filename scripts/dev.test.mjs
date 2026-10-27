// Probes for scripts/dev.mjs. Importing that module must stay side-effect free:
// if it ever boots the group again, every test here hangs or spawns services.
// Run with: node --test scripts/dev.test.mjs
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import net from "node:net";
import { test } from "node:test";
import {
  androidLaunchCommands,
  avdName,
  buildTasks,
  createLineForwarder,
  isPortOpen,
  lanAddress,
  listAvds,
  needsExternalLaunch,
  openAppOnEmulator,
  parseAdbDevices,
  parseFlags,
  resolveBin,
  selectReusable,
} from "./dev.mjs";

const STREAM_BASE = "http://192.168.0.21:3000";

function build(overrides = {}) {
  return buildTasks({
    launchApp: false,
    mobileOnly: false,
    streamBase: STREAM_BASE,
    tauriConfig: "{}",
    ...overrides,
  });
}

const silentLog = () => {
  const lines = [];
  return { lines, log: (m) => lines.push(m), error: (m) => lines.push(m) };
};

test("--android starts the emulator and opens the app", () => {
  assert.deepEqual(parseFlags(["node", "dev.mjs", "--android"]), {
    launchApp: true,
    emulatorOnly: false,
    mobileOnly: false,
    startEmulator: true,
  });
});

test("--emulator starts the device without opening the app", () => {
  assert.deepEqual(parseFlags(["node", "dev.mjs", "--emulator"]), {
    launchApp: false,
    emulatorOnly: true,
    mobileOnly: false,
    startEmulator: true,
  });
});

test("no flag stays inert and --mobile-only is independent", () => {
  assert.deepEqual(parseFlags(["node", "dev.mjs"]), {
    launchApp: false,
    emulatorOnly: false,
    mobileOnly: false,
    startEmulator: false,
  });
  assert.equal(parseFlags(["node", "dev.mjs", "--mobile-only"]).mobileOnly, true);
  assert.equal(parseFlags(["node", "dev.mjs", "--mobile-only"]).startEmulator, false);
});

test("--android forwards --android to expo start", () => {
  const mobile = build({ launchApp: true }).find((task) => task.name === "mobile");
  assert.deepEqual(mobile.args, ["start", "--android"]);
});

test("--emulator never forwards --android to expo start", () => {
  const mobile = build().find((task) => task.name === "mobile");
  assert.deepEqual(mobile.args, ["start"]);
});

test("mobile carries the injected stream base and web pins its own port", () => {
  const tasks = build();
  assert.deepEqual(
    tasks.map((task) => task.name),
    ["api", "web", "mobile", "desktop"],
  );
  assert.equal(
    tasks.find((task) => task.name === "mobile").env.EXPO_PUBLIC_STREAM_BASE_URL,
    STREAM_BASE,
  );
  assert.equal(tasks.find((task) => task.name === "web").env.PORT, "3000");
  assert.equal(tasks.find((task) => task.name === "desktop").port, null);
});

test("--mobile-only keeps Metro alone", () => {
  assert.deepEqual(
    build({ mobileOnly: true }).map((task) => task.name),
    ["mobile"],
  );
});

test("adb output only counts a device that is ready", () => {
  assert.equal(parseAdbDevices("List of devices attached\nemulator-5554\tdevice\n"), true);
  assert.equal(parseAdbDevices("List of devices attached\nemulator-5554\toffline\n"), false);
  assert.equal(parseAdbDevices("List of devices attached\nemulator-5554\tunauthorized\n"), false);
  assert.equal(parseAdbDevices("List of devices attached\n"), false);
  assert.equal(parseAdbDevices(""), false);
  assert.equal(parseAdbDevices(undefined), false);
});

test("the launch commands reverse :8081 and deep-link Expo Go", () => {
  assert.deepEqual(androidLaunchCommands(), [
    ["reverse", "tcp:8081", "tcp:8081"],
    ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "exp://127.0.0.1:8081"],
  ]);
});

test("openAppOnEmulator runs both commands on an attached emulator", () => {
  const calls = [];
  const log = silentLog();
  const opened = openAppOnEmulator({ deviceAttached: true, run: (args) => calls.push(args), log });

  assert.equal(opened, true);
  assert.deepEqual(calls, androidLaunchCommands());
  assert.match(log.lines.join("\n"), /opened the app on the emulator/);
});

test("openAppOnEmulator does nothing without a device", () => {
  const calls = [];
  const log = silentLog();
  const opened = openAppOnEmulator({ deviceAttached: false, run: (args) => calls.push(args), log });

  assert.equal(opened, false);
  assert.deepEqual(calls, []);
  assert.match(log.lines.join("\n"), /no emulator attached/);
});

test("openAppOnEmulator reports a failing adb instead of throwing", () => {
  const log = silentLog();
  const opened = openAppOnEmulator({
    deviceAttached: true,
    run: () => {
      throw new Error("boom");
    },
    log,
  });

  assert.equal(opened, false);
  assert.match(log.lines.join("\n"), /could not open the app on the emulator: boom/);
});

test("an external launch only happens when --android meets a reused Metro", () => {
  const mobile = { name: "mobile" };
  const api = { name: "api" };

  assert.equal(needsExternalLaunch({ launchApp: true, reused: [mobile] }), true);
  assert.equal(needsExternalLaunch({ launchApp: true, reused: [api, mobile] }), true);
  assert.equal(needsExternalLaunch({ launchApp: false, reused: [mobile] }), false);
  assert.equal(needsExternalLaunch({ launchApp: true, reused: [api] }), false);
  assert.equal(needsExternalLaunch({ launchApp: true, reused: [] }), false);
});

test("reuse probes each port and reuses the desktop window off :3000", async () => {
  const tasks = [
    { name: "api", port: 3001 },
    { name: "web", port: 3000 },
    { name: "mobile", port: 8081 },
    { name: "desktop", port: null },
  ];
  const probed = [];
  const { reused, toStart } = await selectReusable(tasks, async (port) => {
    probed.push(port);
    return port === 3000;
  });

  assert.deepEqual(
    reused.map((task) => task.name),
    ["web", "desktop"],
  );
  assert.deepEqual(
    toStart.map((task) => task.name),
    ["api", "mobile"],
  );
  assert.deepEqual(probed, [3001, 3000, 8081, 3000]);
});

test("selectReusable starts everything when nothing is listening", async () => {
  const tasks = [
    { name: "api", port: 3001 },
    { name: "desktop", port: null },
  ];
  const { reused, toStart } = await selectReusable(tasks, async () => false);

  assert.deepEqual(reused, []);
  assert.deepEqual(
    toStart.map((task) => task.name),
    ["api", "desktop"],
  );
});

test("isPortOpen sees a listening port and a closed one", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  assert.equal(await isPortOpen(port, "127.0.0.1", 200, 0), true);

  await new Promise((resolve) => server.close(resolve));
  assert.equal(await isPortOpen(port, "127.0.0.1", 200, 0), false);
});

test("resolveBin finds a workspace binary and falls back to the bare name", () => {
  const expo = resolveBin("expo", "apps/mobile");

  assert.ok(expo.endsWith(`.bin/expo`) || expo.endsWith(`.bin/expo.cmd`), expo);
  assert.ok(existsSync(expo), expo);
  assert.equal(resolveBin("definitely-not-a-binary", "apps/mobile"), "definitely-not-a-binary");
});

test("child output is forwarded line by line as it arrives", () => {
  const written = [];
  const forwarder = createLineForwarder({ write: (chunk) => written.push(chunk) });

  forwarder.push("metro: ready\nweb: compiled\n");

  assert.deepEqual(written, ["metro: ready\n", "web: compiled\n"]);
});

test("a split chunk is buffered until its line is complete", () => {
  const written = [];
  const forwarder = createLineForwarder({ write: (chunk) => written.push(chunk) });

  forwarder.push("compil");
  assert.deepEqual(written, []);

  forwarder.push("ing...\n");
  assert.deepEqual(written, ["compiling...\n"]);
});

test("the trailing partial line is flushed when the stream ends", () => {
  const written = [];
  const forwarder = createLineForwarder({ write: (chunk) => written.push(chunk) });

  forwarder.push("no trailing newline");
  forwarder.end();

  assert.deepEqual(written, ["no trailing newline\n"]);
});

test("pnpm failure banners are dropped without losing their neighbours", () => {
  const written = [];
  const forwarder = createLineForwarder({ write: (chunk) => written.push(chunk) });

  forwarder.push("ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed\nweb: compiled\n");
  forwarder.end();

  assert.deepEqual(written, ["web: compiled\n"]);
});

test("an empty line from the child is still forwarded as-is", () => {
  const written = [];
  const forwarder = createLineForwarder({ write: (chunk) => written.push(chunk) });

  forwarder.push("a\n\nb\n");

  assert.deepEqual(written, ["a\n", "\n", "b\n"]);
});

test("lanAddress falls back to localhost without a LAN interface", () => {
  assert.equal(
    lanAddress({ lo: [{ family: "IPv4", internal: true, address: "127.0.0.1" }] }),
    "localhost",
  );
  assert.equal(
    lanAddress({ wlan0: [{ family: "IPv4", internal: false, address: "10.0.0.5" }] }),
    "10.0.0.5",
  );
  assert.equal(lanAddress({}), "localhost");
});

test("avdName honors ANDROID_AVD and auto-detects a single AVD", () => {
  assert.equal(avdName({ ANDROID_AVD: "Pixel_8" }), "Pixel_8");
  assert.equal(avdName({ ANDROID_AVD: "Pixel_8" }, ["Pixel_7", "Pixel_Tablet"]), "Pixel_8");
  assert.equal(avdName({}, ["Pixel_7"]), "Pixel_7");
  assert.equal(avdName({}, null), null);
  assert.equal(avdName({}, []), null);
  assert.equal(avdName({}, ["Pixel_7", "Pixel_Tablet"]), null);
});

test("listAvds parses the emulator output and tolerates failures", () => {
  const fakeRun = (_bin, _args) => "Pixel_7\nPixel_Tablet\n";
  assert.deepEqual(listAvds("/fake/emulator", fakeRun), ["Pixel_7", "Pixel_Tablet"]);

  const emptyRun = () => "";
  assert.deepEqual(listAvds("/fake/emulator", emptyRun), []);

  const failingRun = () => {
    throw new Error("boom");
  };
  assert.deepEqual(listAvds("/fake/emulator", failingRun), []);

  assert.deepEqual(listAvds("/does/not/exist", failingRun), []);
});
