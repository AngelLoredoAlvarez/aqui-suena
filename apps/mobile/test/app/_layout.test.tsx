// @vitest-environment jsdom

import RootLayout from "@aqui-suena/mobile/app/_layout";
import { useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  detectNativeLocale: vi.fn((tag?: string) => (tag?.startsWith("es") ? "es" : "en")),
  loadPersistedLocaleAsync: vi.fn(async (): Promise<"es" | "en" | undefined> => undefined),
  savePersistedLocaleAsync: vi.fn(async (): Promise<void> => {}),
}));

vi.mock("@aqui-suena/ui", () => ({
  UiProvider: ({ children }: { children?: unknown }) => children,
  LocaleProvider: ({
    locale,
    onChange,
    children,
  }: {
    locale?: string;
    onChange?: (next: string) => void;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": "locale-provider",
        "data-locale": locale,
        onClick: () => onChange?.("en"),
      },
      children,
    ),
  detectNativeLocale: ui.detectNativeLocale,
  loadPersistedLocaleAsync: ui.loadPersistedLocaleAsync,
  savePersistedLocaleAsync: ui.savePersistedLocaleAsync,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(useFonts as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue([
    true,
    null,
  ]);
  ui.loadPersistedLocaleAsync.mockResolvedValue(undefined);
});

describe("RootLayout", () => {
  it("detects the native locale and restores the persisted choice", () => {
    render(<RootLayout />);

    expect(ui.detectNativeLocale).toHaveBeenCalledWith("es-MX");
    expect(screen.getByTestId("stack")).toBeTruthy();
    expect(ui.loadPersistedLocaleAsync).toHaveBeenCalled();
  });

  it("renders nothing while the fonts are loading", () => {
    vi.mocked(useFonts as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue(
      [false, null],
    );

    const { container } = render(<RootLayout />);

    expect(container.firstChild).toBeNull();
  });

  it("keeps the detected locale when restoring storage fails", async () => {
    ui.loadPersistedLocaleAsync.mockRejectedValueOnce(new Error("denied"));

    render(<RootLayout />);
    await act(async () => {});

    expect(screen.getByTestId("locale-provider").dataset.locale).toBe("es");
  });

  it("restores the persisted locale", async () => {
    ui.loadPersistedLocaleAsync.mockResolvedValueOnce("en");

    render(<RootLayout />);
    await act(async () => {});

    expect(screen.getByTestId("locale-provider").dataset.locale).toBe("en");
  });

  it("persists a manual locale change", () => {
    render(<RootLayout />);

    fireEvent.click(screen.getByTestId("locale-provider"));

    expect(ui.savePersistedLocaleAsync).toHaveBeenCalledWith(expect.anything(), "en");
  });
});
