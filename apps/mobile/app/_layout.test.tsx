// @vitest-environment jsdom

import RootLayout from "@aqui-suena/mobile/app/_layout";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  detectNativeLocale: vi.fn((tag?: string) => (tag?.startsWith("es") ? "es" : "en")),
  loadPersistedLocaleAsync: vi.fn(async () => null),
  savePersistedLocaleAsync: vi.fn(async () => {}),
}));

vi.mock("@aqui-suena/ui", () => ({
  UiProvider: ({ children }: { children?: unknown }) => children,
  LocaleProvider: ({ children }: { children?: unknown }) => children,
  detectNativeLocale: ui.detectNativeLocale,
  loadPersistedLocaleAsync: ui.loadPersistedLocaleAsync,
  savePersistedLocaleAsync: ui.savePersistedLocaleAsync,
}));

afterEach(cleanup);

describe("RootLayout", () => {
  it("detects the native locale and restores the persisted choice", () => {
    render(<RootLayout />);

    expect(ui.detectNativeLocale).toHaveBeenCalledWith("es-MX");
    expect(screen.getByTestId("stack")).toBeTruthy();
    expect(ui.loadPersistedLocaleAsync).toHaveBeenCalled();
  });
});
