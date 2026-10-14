// @vitest-environment jsdom

import type { SupportedLocale } from "@aqui-suena/ui/i18n";
import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { UiProvider } from "@aqui-suena/ui/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerLanding } from "./player-landing";

class FakeAudio {
  src = "";
  setAttribute(_name: string, _value: string): void {}
  play(): Promise<void> {
    return Promise.resolve();
  }
  pause(): void {}
}

const playSpy = vi.fn(() => Promise.resolve());
const pauseSpy = vi.fn();

vi.mock("@aqui-suena/ui/drivers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aqui-suena/ui/drivers")>();
  return {
    ...actual,
    useExpoAudioDriver: () => ({ play: playSpy, pause: pauseSpy }),
  };
});

beforeEach(() => {
  vi.stubGlobal("Audio", FakeAudio);
  playSpy.mockClear();
  pauseSpy.mockClear();
});

function renderLanding(locale: SupportedLocale = "en") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UiProvider>
      <LocaleProvider locale={locale} onChange={() => {}}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </LocaleProvider>
    </UiProvider>
  );
  return render(<PlayerLanding />, { wrapper });
}

describe("PlayerLanding with channels", () => {
  afterEach(() => {
    cleanup();
  });

  it("list the three channels in Spanish once loaded", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    expect(screen.getByTestId("station-selector")).toBeTruthy();
    expect(screen.getAllByText("Test Pop").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Test Jingle")).toBeTruthy();
    expect(screen.getByText("Test Night")).toBeTruthy();
  });

  it("switches the stream when a channel is chosen", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    fireEvent.click(screen.getByText("Test Night"));

    expect(playSpy).toHaveBeenCalledWith("/test-streams/test-night.m4a");
  });

  it("pauses the previous station when switching channels", async () => {
    renderLanding();

    await screen.findByText(/listening/);

    fireEvent.click(screen.getByText("Test Night"));

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("show the selected channel name as title", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    fireEvent.click(screen.getByText("Test Night"));

    await waitFor(() => {
      expect(screen.getAllByText("Test Night").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("keeps the selector visible while the new channel connects", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    playSpy.mockReturnValueOnce(new Promise<void>(() => {}));

    fireEvent.click(screen.getByText("Test Night"));

    expect(screen.getByTestId("station-selector")).toBeTruthy();
  });

  it("disables the connecting channel while it loads", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    playSpy.mockReturnValueOnce(new Promise<void>(() => {}));

    fireEvent.click(screen.getByText("Test Night"));

    expect(screen.getByText("Test Night").closest("button")?.getAttribute("aria-disabled")).toBe(
      "true",
    );
  });
});
