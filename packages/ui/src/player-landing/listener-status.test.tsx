// @vitest-environment jsdom
import { defaultStationId } from "@aqui-suena/config";
import type { SupportedLocale } from "@aqui-suena/ui/i18n";
import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { UiProvider } from "@aqui-suena/ui/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useListenerStatus } from "./listener-status";
import { PlayerLanding } from "./player-landing";

// jsdom ships an Audio element whose play() is not implemented. Stub it so
// the shared web driver resolves deterministically in these suites.
class FakeAudio {
  src = "";

  setAttribute(_name: string, _value: string): void {}

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}
}

beforeEach(() => {
  vi.stubGlobal("Audio", FakeAudio);
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

describe("PlayerLanding listener status", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a loading state before the status resolves", () => {
    renderLanding();

    expect(screen.getByText("Loading station status…")).toBeTruthy();
  });

  it("shows the Spanish loading state under the es locale", () => {
    renderLanding("es");

    expect(screen.getByText("Cargando estado de la estación…")).toBeTruthy();
  });

  it("shows the station status once loaded", async () => {
    renderLanding();

    expect(await screen.findByText(/listening/)).toBeTruthy();
  });

  it("keeps the SSR-identical loading fallback on first paint with a warm listener cache", async () => {
    // Mounted-gate invariant: client-only state (a warm react-query cache,
    // e.g. after client-side navigation) must not change the first paint —
    // it renders the same loading fallback as SSR until mounted, so
    // hydration compares identical trees. Note: usePlayer initializes to
    // "idle" on both sides, so this holds without the gate today; the test
    // pins the invariant the gate guarantees against future hook changes.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["listener-status", defaultStationId], {
      station: { id: defaultStationId, name: "Aqui Suena" },
      activeUrl: "https://stream.example.com/live",
      listeners: 42,
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiProvider>
        <LocaleProvider locale="en" onChange={() => {}}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </LocaleProvider>
      </UiProvider>
    );
    render(<PlayerLanding />, { wrapper });

    expect(screen.getByText("Loading station status…")).toBeTruthy();
    expect(screen.queryByText(/listening/)).toBeNull();
    expect(await screen.findByText(/listening/)).toBeTruthy();
  });

  it("shows an error state when the status fails", async () => {
    function BrokenStatus() {
      const { isError } = useListenerStatus("");
      return isError ? <span>Station status unavailable.</span> : null;
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <BrokenStatus />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Station status unavailable.")).toBeTruthy();
  });
});
