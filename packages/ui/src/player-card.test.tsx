// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "./i18n/locale-context";
import type { SupportedLocale } from "./i18n/locales";
import type { StationRef } from "./player-card";
import { PlayerCard } from "./player-card";
import { UiProvider } from "./provider";

const STATIONS: readonly StationRef[] = [
  { id: "station-1", name: "Station One" },
  { id: "station-2", name: "Station Two" },
];

function renderCard(props: {
  status: "playing" | "paused" | "loading" | "blocked" | "error";
  locale?: SupportedLocale;
  onResume?: () => void;
  onPause?: () => void;
  stations?: readonly StationRef[];
  onSelectStation?: (stationId: string) => void;
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
      stationName="Aqui Suena"
      listeners={42}
      onResume={props.onResume ?? (() => {})}
      onPause={props.onPause ?? (() => {})}
      stations={props.stations}
      onSelectStation={props.onSelectStation}
      status={props.status}
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

    expect(screen.getByText("Playing")).toBeTruthy();
    expect(screen.getByText(/42 listening/)).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("shows exactly one resume tap and nothing else clickable when blocked", () => {
    renderCard({ status: "blocked" });

    expect(screen.getByText("Tap to enable sound")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("calls onResume once when the resume tap is pressed", () => {
    const onResume = vi.fn();
    renderCard({ status: "blocked", onResume });

    fireEvent.click(screen.getByRole("button"));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("shows the mirror message with no resume button on error", () => {
    renderCard({ status: "error" });

    expect(screen.getByText("Signal unavailable, trying mirror…")).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("selects a station from the selector when playing", () => {
    const onSelectStation = vi.fn();
    renderCard({ status: "playing", stations: STATIONS, onSelectStation });

    fireEvent.click(screen.getByText("Station Two"));

    expect(onSelectStation).toHaveBeenCalledTimes(1);
    expect(onSelectStation).toHaveBeenCalledWith("station-2");
  });

  it("hides the selector while blocked", () => {
    renderCard({ status: "blocked", stations: STATIONS, onSelectStation: () => {} });

    expect(screen.queryByText("Station Two")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps the selector as an escape hatch on error", () => {
    renderCard({ status: "error", stations: STATIONS, onSelectStation: () => {} });

    expect(screen.getByText("Station One")).toBeTruthy();
    expect(screen.getByText("Station Two")).toBeTruthy();
  });

  it("shows a pause button while playing that calls onPause", () => {
    const onPause = vi.fn();
    renderCard({ status: "playing", onPause });

    fireEvent.click(screen.getByText("Pause"));

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("shows paused state with a resume tap and no pause button", () => {
    const onResume = vi.fn();
    renderCard({ status: "paused", onResume, onPause: () => {} });

    expect(screen.getByText("Paused")).toBeTruthy();
    fireEvent.click(screen.getByText("Resume"));

    expect(onResume).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Pause")).toBeNull();
  });

  it("keeps the selector visible while paused", () => {
    renderCard({ status: "paused", stations: STATIONS, onSelectStation: () => {} });

    expect(screen.getByText("Station One")).toBeTruthy();
    expect(screen.getByText("Station Two")).toBeTruthy();
  });

  it("hides the selector while loading", () => {
    renderCard({ status: "loading", stations: STATIONS, onSelectStation: () => {} });

    expect(screen.queryByText("Station Two")).toBeNull();
  });

  it("renders Spanish copy under the es locale", () => {
    renderCard({ status: "playing", locale: "es" });

    expect(screen.getByText("Reproduciendo")).toBeTruthy();
    expect(screen.getByText("42 escuchando")).toBeTruthy();
    expect(screen.getByText("Pausar")).toBeTruthy();
  });

  it("renders the Spanish blocked tap under the es locale", () => {
    renderCard({ status: "blocked", locale: "es" });

    expect(screen.getByText("Toca para activar el sonido")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
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

  it("shows a status dot for playing/paused/loading/error but not for blocked", () => {
    for (const status of ["playing", "paused", "loading", "error"] as const) {
      renderCard({ status });
      expect(screen.getByTestId("status-dot")).toBeTruthy();
      cleanup();
    }

    renderCard({ status: "blocked" });
    expect(screen.queryByTestId("status-dot")).toBeNull();
  });

  it("renders the station selector as chips", () => {
    renderCard({ status: "playing", stations: STATIONS, onSelectStation: () => {} });

    const selector = screen.getByTestId("station-selector");
    expect(selector).toBeTruthy();
    expect(selector.getAttribute("data-testid")).toBe("station-selector");
    expect(screen.getByText("Station One")).toBeTruthy();
    expect(screen.getByText("Station Two")).toBeTruthy();
  });
});
