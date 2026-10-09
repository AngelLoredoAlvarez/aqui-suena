// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "./i18n/locale-context";
import type { SupportedLocale } from "./i18n/locales";
import { useListenerStatus } from "./listener-status";
import { PlayerLanding } from "./player-landing";
import { UiProvider } from "./provider";

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
