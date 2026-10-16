// @vitest-environment jsdom

import type { SupportedLocale } from "@aqui-suena/ui/i18n";
import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { UiProvider } from "@aqui-suena/ui/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function renderLanding(locale: SupportedLocale = "en", scheme: "noche" | "brasa" = "noche") {
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

  return render(<PlayerLanding scheme={scheme} />, { wrapper });
}

describe("PlayerLanding with channels", () => {
  afterEach(() => {
    cleanup();
  });

  it("lists the three channels in the sheet in Spanish once loaded", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    expect(screen.queryByTestId("station-sheet")).toBeNull();

    fireEvent.click(screen.getByTestId("station-name"));

    const sheet = screen.getByTestId("station-sheet");
    expect(within(sheet).getByText("Test Pop")).toBeTruthy();
    expect(within(sheet).getByText("Test Jingle")).toBeTruthy();
    expect(within(sheet).getByText("Test Night")).toBeTruthy();
  });

  it("switches the stream when a channel is chosen in the sheet", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    expect(playSpy).toHaveBeenCalledWith("/test-streams/test-night.m4a");
    expect(screen.queryByTestId("station-sheet")).toBeNull();
  });

  it("shows the selected channel name as title", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    await waitFor(() => {
      expect(screen.getAllByText("Test Night").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("keeps the sheet opener while the new channel connects", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    playSpy.mockReturnValueOnce(new Promise<void>(() => {}));

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    expect(screen.getByTestId("station-name")).toBeTruthy();
    expect(screen.getByText("Test Pop")).toBeTruthy();
  });

  it("marks the connecting channel with the active check in the sheet", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    playSpy.mockReturnValueOnce(new Promise<void>(() => {}));

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    fireEvent.click(screen.getByTestId("station-name"));

    const sheet = screen.getByTestId("station-sheet");
    const check = within(sheet).getByTestId("station-sheet-check");
    expect(check.closest("button")?.getAttribute("aria-label")).toBe("Test Night");
  });

  it("keeps showing the previous channel name while the new one connects", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    playSpy.mockReturnValueOnce(new Promise<void>(() => {}));

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    expect(screen.getByText("Test Pop")).toBeTruthy();
  });

  it("does not pause the previous station when switching channels", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    expect(pauseSpy).not.toHaveBeenCalled();
  });

  it("keeps showing the previous card while the new channel connects", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    playSpy.mockReturnValueOnce(new Promise<void>(() => {}));

    fireEvent.click(screen.getByTestId("station-name"));
    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    expect(screen.getByText("Test Pop")).toBeTruthy();
    expect(screen.getByText(/escuchando/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
  });
});

describe("PlayerLanding composition", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the dock after the content in noche scheme", async () => {
    renderLanding("es", "noche");

    await screen.findByText(/escuchando/);

    const dock = screen.getByTestId("player-dock");
    const content = screen.getByTestId("landing-content");

    expect(content.compareDocumentPosition(dock)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders the dock before the content in brasa scheme", async () => {
    renderLanding("es", "brasa");

    await screen.findByText(/escuchando/);

    const dock = screen.getByTestId("player-dock");
    const content = screen.getByTestId("landing-content");

    expect(dock.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe("PlayerLanding station sheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens the sheet from the station name and plays the chosen station", async () => {
    renderLanding("es");

    await screen.findByText(/escuchando/);

    expect(screen.queryByTestId("station-sheet")).toBeNull();

    fireEvent.click(screen.getByTestId("station-name"));

    expect(screen.getByTestId("station-sheet")).toBeTruthy();

    fireEvent.click(within(screen.getByTestId("station-sheet")).getByText("Test Night"));

    expect(playSpy).toHaveBeenCalledWith("/test-streams/test-night.m4a");
    expect(screen.queryByTestId("station-sheet")).toBeNull();
  });
});
