// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "./i18n/locale-context";
import type { SupportedLocale } from "./i18n/locales";
import { PlayerLanding } from "./player-landing";
import { UiProvider } from "./provider";

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

vi.mock("./expo-driver", () => ({
  useExpoAudioDriver: () => ({ play: playSpy, pause: pauseSpy }),
}));

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
    expect(screen.getByText("Test Pop")).toBeTruthy();
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
});
