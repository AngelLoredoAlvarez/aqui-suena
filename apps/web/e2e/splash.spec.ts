import { expect, test } from "@playwright/test";

const markDesktopShell = (): void => {
  const apply = (): boolean => {
    if (!document.documentElement) {
      return false;
    }

    document.documentElement.classList.add("tauri");
    return true;
  };

  if (apply()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (apply()) {
      observer.disconnect();
    }
  });

  observer.observe(document, { childList: true, subtree: true });
};

test.describe("boot splash", () => {
  test("browser skips the desktop splash", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".boot-splash")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Aquí Suena" })).toBeVisible();
  });

  test("desktop shell paints the splash and then reveals the app", async ({ page }) => {
    await page.addInitScript(markDesktopShell);
    await page.goto("/", { waitUntil: "commit" });

    const splash = page.locator(".boot-splash");

    await expect(splash).toBeVisible();

    const content = await splash.evaluate((element) => ({
      label: element.getAttribute("aria-label"),
      text: element.textContent,
      logo: element.querySelector('[aria-label="Logo de Aquí Suena"]') !== null,
      progress: element.querySelector('[role="progressbar"]') !== null,
    }));

    expect(content.label).toBe("Cargando Aquí Suena");
    expect(content.text).toContain("Aquí Suena");
    expect(content.logo).toBe(true);
    expect(content.progress).toBe(true);

    await expect(splash).toBeHidden({ timeout: 3000 });
    await expect(page.getByRole("heading", { name: "Aquí Suena" })).toBeVisible();
  });
});
