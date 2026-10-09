// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StationRef } from "./player-card";
import { PlayerCard } from "./player-card";
import { UiProvider } from "./provider";

const STATIONS: readonly StationRef[] = [
  { id: "station-1", name: "Station One" },
  { id: "station-2", name: "Station Two" },
];

function renderCard(props: {
  status: "playing" | "paused" | "loading" | "blocked" | "error";
  onResume?: () => void;
  onPause?: () => void;
  stations?: readonly StationRef[];
  onSelectStation?: (stationId: string) => void;
}) {
  const wrapper = ({ children }: { children: ReactNode }) => <UiProvider>{children}</UiProvider>;
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
});
