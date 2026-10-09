import { expect, type Page, test } from "@playwright/test";

// Player e2e: landing renders shared PlayerLanding (PlayerCard +
// LocaleSwitcher + AdsCarousel); audio goes through the same-origin
// /api/stream proxy. Media is stubbed at the network edge (route fulfill
// with a minimal WAV, route abort for the primary mirror) so assertions are
// deterministic headless; UI assertions use roles/text only, never CSS or
// component internals.

type Locale = "es" | "en";

const COPY: Record<
  Locale,
  { playing: string; paused: string; pause: string; resume: string; tap: string }
> = {
  es: {
    playing: "Reproduciendo",
    paused: "En pausa",
    pause: "Pausar",
    resume: "Reanudar",
    tap: "Toca para activar el sonido",
  },
  en: {
    playing: "Playing",
    paused: "Paused",
    pause: "Pause",
    resume: "Resume",
    tap: "Tap to enable sound",
  },
};

function localeOf(testName: string): Locale {
  return testName.includes("chromium-en") ? "en" : "es";
}

// Minimal valid WAV (8 kHz mono 8-bit silence): enough for the media element
// to resolve play() without real stream bytes.
function makeWavBytes(): Buffer {
  const samples = 800;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + samples, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(samples, 40);
  return Buffer.concat([header, Buffer.alloc(samples, 128)]);
}

const WAV = makeWavBytes();

// Fail on any console error or uncaught page error. Call before goto,
// assert at the end of each test.
function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(String(error));
  });
  return errors;
}

async function fulfillStreamWithWav(page: Page): Promise<void> {
  await page.route("**/api/stream*", async (route) => {
    await route.fulfill({ body: WAV, contentType: "audio/wav" });
  });
}

// T1 smoke: landing renders the shared player shell (H1 + locale switcher
// + ads slot). Player state assertions live in the T2 slices below, where
// routes are stubbed for determinism.
test("landing renders the shared player", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aqui Suena");
  await expect(page.getByRole("button", { name: "Español" })).toBeVisible();
  await expect(page.getByRole("button", { name: "English" })).toBeVisible();
  await expect(page.getByLabel("Advertisements")).toBeVisible();
});

test("autoplay reaches playing, or blocked tap resumes to playing", async ({ page }, testInfo) => {
  const copy = COPY[localeOf(testInfo.project.name)];
  const errors = trackConsole(page);
  await fulfillStreamWithWav(page);

  await page.goto("/");

  // Autoplay policy decides the first paint: playing when allowed, the
  // one-tap resume when blocked. Both are valid; the tap must lead to playing.
  await expect(
    page.getByText(copy.playing).or(page.getByRole("button", { name: copy.tap })),
  ).toBeVisible();
  const tap = page.getByRole("button", { name: copy.tap });
  if (await tap.isVisible()) {
    await tap.click();
  }
  await expect(page.getByText(copy.playing)).toBeVisible();

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("blocked autoplay resumes with one tap", async ({ page }, testInfo) => {
  const copy = COPY[localeOf(testInfo.project.name)];
  const errors = trackConsole(page);
  await fulfillStreamWithWav(page);
  // Deterministic block: every play() rejects with NotAllowedError until
  // the test flips the flag, so StrictMode remounts cannot slip into
  // playing before the tap assertion. The resume tap plays for real (WAV).
  await page.addInitScript(() => {
    const original = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!(window as unknown as { __unblockPlayback?: boolean }).__unblockPlayback) {
        return Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
      }
      return original.call(this);
    };
  });

  await page.goto("/");

  const tap = page.getByRole("button", { name: copy.tap });
  await expect(tap).toBeVisible();
  await expect(page.getByText(copy.playing)).toBeHidden();
  await page.evaluate(() => {
    (window as unknown as { __unblockPlayback?: boolean }).__unblockPlayback = true;
  });
  await tap.click();
  await expect(page.getByText(copy.playing)).toBeVisible();

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("aborted primary mirror engages fallback and keeps playing", async ({ page }, testInfo) => {
  const copy = COPY[localeOf(testInfo.project.name)];
  const errors = trackConsole(page);
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/stream")) {
      requested.push(request.url());
    }
  });
  await page.route("**/api/stream*", async (route) => {
    if (route.request().url().includes("ice1")) {
      await route.abort();
      return;
    }
    await route.fulfill({ body: WAV, contentType: "audio/wav" });
  });

  await page.goto("/");

  await expect(page.getByText(copy.playing)).toBeVisible({ timeout: 20_000 });
  expect(
    requested.some((url) => url.includes("ice1")),
    "primary mirror requested",
  ).toBe(true);
  expect(
    requested.some((url) => url.includes("ice2")),
    "fallback mirror requested",
  ).toBe(true);

  // The aborted primary surfaces one Chromium network-layer report
  // ("Failed to load resource: net::ERR_FAILED") without a URL; it is the
  // test-injected failure, not app logging, so only that exact message is
  // allowlisted — everything else still fails.
  const streamNoise = errors.filter(
    (message) => message !== "Failed to load resource: net::ERR_FAILED",
  );
  expect(streamNoise, `console errors: ${streamNoise.join("\n")}`).toEqual([]);
});

test("pause and resume flip the player status", async ({ page }, testInfo) => {
  const copy = COPY[localeOf(testInfo.project.name)];
  const errors = trackConsole(page);
  await fulfillStreamWithWav(page);

  await page.goto("/");

  await expect(page.getByText(copy.playing)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: copy.pause }).click();
  await expect(page.getByText(copy.paused)).toBeVisible();
  await page.getByRole("button", { name: copy.resume }).click();
  await expect(page.getByText(copy.playing)).toBeVisible();

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("locale switcher flips es/en copy and persists across reload", async ({ page }, testInfo) => {
  const errors = trackConsole(page);
  await fulfillStreamWithWav(page);
  const start = localeOf(testInfo.project.name);
  const next: Locale = start === "es" ? "en" : "es";

  await page.goto("/");

  // Starting locale copy is on screen (playing text proves the player, not
  // just the shell, renders in that locale).
  await expect(page.getByText(COPY[start].playing)).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: next === "es" ? "Español" : "English" }).click();
  await expect(page.getByText(COPY[next].playing)).toBeVisible();

  await page.reload();
  await expect(page.getByText(COPY[next].playing)).toBeVisible({ timeout: 20_000 });

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});
