// @vitest-environment jsdom

import type { SupportedLocale } from "@aqui-suena/ui/i18n";
import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { UiProvider } from "@aqui-suena/ui/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlaybackIcon, PlayButton, PlayerCard, type PlayerCardStatus } from "./player-card";

function renderCard(props: {
  status: "idle" | "playing" | "paused" | "loading" | "error" | "blocked";
  locale?: SupportedLocale;
  onResume?: () => void;
  onPause?: () => void;
  onOpenSheet?: () => void;
}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UiProvider>
      <LocaleProvider locale={props.locale ?? "en"} onChange={() => {}}>
        {children}
      </LocaleProvider>
    </UiProvider>
  );
  return render(
    <PlayerCard
      stationName="Aquí Suena"
      listeners={42}
      onResume={props.onResume ?? (() => {})}
      onPause={props.onPause ?? (() => {})}
      onOpenSheet={props.onOpenSheet}
      status={props.status}
    />,
    { wrapper },
  );
}

function renderPlayButton(
  status: PlayerCardStatus,
  options?: {
    locale?: SupportedLocale;
    onResume?: () => void;
    onPause?: () => void;
  },
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UiProvider>
      <LocaleProvider locale={options?.locale ?? "en"} onChange={() => {}}>
        {children}
      </LocaleProvider>
    </UiProvider>
  );

  return render(
    <PlayButton
      status={status}
      onResume={options?.onResume ?? (() => {})}
      onPause={options?.onPause ?? (() => {})}
    />,
    { wrapper },
  );
}

describe("PlayerCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the status and listeners with no resume button when playing", () => {
    renderCard({ status: "playing" });

    expect(screen.getByText(/Playing · 42 listening/)).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("shows the blocked tap alongside the station name opener when blocked", () => {
    renderCard({ status: "blocked" });

    expect(screen.getByRole("button", { name: "Tap to enable sound" })).toBeTruthy();
    expect(screen.getByTestId("station-name")).toBeTruthy();
  });

  it("calls onResume once when the resume tap is pressed", () => {
    const onResume = vi.fn();
    renderCard({ status: "blocked", onResume });

    fireEvent.click(screen.getByRole("button", { name: "Tap to enable sound" }));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("shows the mirror message with no resume button on error", () => {
    renderCard({ status: "error" });

    expect(screen.getByText("Signal unavailable, trying mirror…")).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("hides the selector while blocked", () => {
    renderCard({ status: "blocked" });

    expect(screen.queryByText("Station Two")).toBeNull();
    expect(screen.getByRole("button", { name: "Tap to enable sound" })).toBeTruthy();
  });

  it("shows no inline selector on error, station name opens the sheet", () => {
    renderCard({ status: "error" });

    expect(screen.queryByTestId("station-selector")).toBeNull();
    expect(screen.getByTestId("station-name")).toBeTruthy();
  });

  it("shows a pause button while playing that calls onPause", () => {
    const onPause = vi.fn();
    renderCard({ status: "playing", onPause });

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("shows paused state with a resume tap and no pause button", () => {
    const onResume = vi.fn();
    renderCard({ status: "paused", onResume, onPause: () => {} });

    expect(screen.getByText("Paused")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(onResume).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Pause")).toBeNull();
  });

  it("shows no inline selector while paused, station name opens the sheet", () => {
    renderCard({ status: "paused" });

    expect(screen.queryByTestId("station-selector")).toBeNull();
    expect(screen.getByTestId("station-name")).toBeTruthy();
  });

  it("hides the selector while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.queryByText("Station Two")).toBeNull();
  });

  it("renders Spanish copy under the es locale", () => {
    renderCard({ status: "playing", locale: "es" });

    expect(screen.getByText(/Reproduciendo · 42 escuchando/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
  });

  it("renders the Spanish blocked tap under the es locale", () => {
    renderCard({ status: "blocked", locale: "es" });

    expect(screen.getByRole("button", { name: "Toca para activar el sonido" })).toBeTruthy();
    expect(screen.getByTestId("station-name")).toBeTruthy();
  });

  it("renders the Spanish mirror message under the es locale", () => {
    renderCard({ status: "error", locale: "es" });

    expect(screen.getByText("Señal no disponible, probando espejo…")).toBeTruthy();
  });

  it("labels the pause/resume buttons bilingually for assistive tech", () => {
    renderCard({ status: "playing", locale: "en" });
    expect(screen.getByRole("button", { name: "Pause" }).getAttribute("aria-label")).toBe("Pause");
    cleanup();

    renderCard({ status: "paused", locale: "es" });
    expect(screen.getByRole("button", { name: "Reanudar" }).getAttribute("aria-label")).toBe(
      "Reanudar",
    );
  });

  it("shows a status dot for playing/paused/loading/error but not for blocked or idle", () => {
    for (const status of ["playing", "paused", "loading", "error"] as const) {
      renderCard({ status });
      expect(screen.getByTestId("status-dot")).toBeTruthy();
      cleanup();
    }

    renderCard({ status: "blocked" });
    expect(screen.queryByTestId("status-dot")).toBeNull();

    renderCard({ status: "idle" });
    expect(screen.queryByTestId("status-dot")).toBeNull();
  });

  it("renders inside the bottom dock container", () => {
    renderCard({ status: "playing" });

    expect(screen.getByTestId("player-dock")).toBeTruthy();
  });

  it("shows a tap-to-listen button with no loading text when idle", () => {
    renderCard({ status: "idle" });

    expect(screen.getByRole("button", { name: "Tap to listen" })).toBeTruthy();
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("notifies when the station name is tapped", () => {
    const onOpenSheet = vi.fn();
    renderCard({ status: "playing", onOpenSheet });

    fireEvent.click(screen.getByTestId("station-name"));

    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });
});

describe("getPlaybackIcon", () => {
  it("returns pause for playing", () => {
    expect(getPlaybackIcon("playing")).toBe("pause");
  });

  it("returns play for paused, idle and blocked", () => {
    expect(getPlaybackIcon("paused")).toBe("play");
    expect(getPlaybackIcon("idle")).toBe("play");
    expect(getPlaybackIcon("blocked")).toBe("play");
  });

  it("returns loading for loading", () => {
    expect(getPlaybackIcon("loading")).toBe("loading");
  });

  it("returns null for error", () => {
    expect(getPlaybackIcon("error")).toBeNull();
  });
});

describe("PlayButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a 64px pause icon button for playing", () => {
    renderPlayButton("playing", { locale: "en" });

    const button = screen.getByRole("button", { name: "Pause" });

    expect(button.getAttribute("aria-label")).toBe("Pause");
    expect(button.querySelector('[data-testid="playback-icon"]')).not.toBeNull();
    expect(screen.queryByText("Pause")).toBeNull();
  });

  it("renders a play icon button for paused", () => {
    renderPlayButton("paused", { locale: "en" });

    const button = screen.getByRole("button", { name: "Resume" });

    expect(button.querySelector('[data-testid="playback-icon"]')).not.toBeNull();
  });

  it("renders a disabled loading icon button for loading", () => {
    renderPlayButton("loading", { locale: "en" });

    const button = screen.getByRole("button", { name: "Loading…" });

    expect(button.getAttribute("disabled")).not.toBeNull();
    expect(button.querySelector('[data-testid="playback-icon"]')).not.toBeNull();
  });

  it("marks the button as playing only while playing", () => {
    renderPlayButton("playing", { locale: "en" });
    const playing = screen.getByRole("button", { name: "Pause" });
    expect(playing.getAttribute("data-playing")).toBe("true");

    cleanup();
    renderPlayButton("paused", { locale: "en" });
    const paused = screen.getByRole("button", { name: "Resume" });
    expect(paused.getAttribute("data-playing")).toBeNull();
  });
});
