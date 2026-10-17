// @vitest-environment jsdom
import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { UiProvider } from "@aqui-suena/ui/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SheetStation } from "./station-sheet";
import { StationSheet } from "./station-sheet";

function manyStations(count: number): readonly SheetStation[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `station-${index + 1}`,
    name: `Station ${index + 1}`,
    live: index % 2 === 0,
  }));
}

function renderSheet(props: {
  open?: boolean;
  stations?: readonly SheetStation[];
  activeStationId?: string;
  onSelectStation?: (stationId: string) => void;
  onClose?: () => void;
}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UiProvider>
      <LocaleProvider locale="en" onChange={() => {}}>
        {children}
      </LocaleProvider>
    </UiProvider>
  );
  return render(
    <StationSheet
      open={props.open ?? true}
      stations={props.stations ?? manyStations(3)}
      activeStationId={props.activeStationId}
      onSelectStation={props.onSelectStation ?? (() => {})}
      onClose={props.onClose ?? (() => {})}
    />,
    { wrapper },
  );
}

describe("StationSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when closed", () => {
    renderSheet({ open: false, stations: manyStations(3) });

    expect(screen.queryByTestId("station-sheet")).toBeNull();
  });

  it("lists every station when open, beyond the three test channels", () => {
    renderSheet({ stations: manyStations(12) });

    expect(screen.getByText("Stations")).toBeTruthy();
    expect(screen.getAllByTestId("station-sheet-row")).toHaveLength(12);
    expect(screen.getByText("Station 12")).toBeTruthy();
  });

  it("renders Spanish title and live badge", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiProvider>
        <LocaleProvider locale="es" onChange={() => {}}>
          {children}
        </LocaleProvider>
      </UiProvider>
    );
    render(
      <StationSheet
        open
        stations={manyStations(3)}
        onSelectStation={() => {}}
        onClose={() => {}}
      />,
      { wrapper },
    );

    expect(screen.getByText("Estaciones")).toBeTruthy();
    expect(screen.getAllByText("En vivo").length).toBeGreaterThanOrEqual(1);
  });

  it("notifies the chosen station and closes", () => {
    const onSelectStation = vi.fn();
    const onClose = vi.fn();

    renderSheet({ stations: manyStations(3), onSelectStation, onClose });

    fireEvent.click(screen.getByText("Station 2"));

    expect(onSelectStation).toHaveBeenCalledTimes(1);
    expect(onSelectStation).toHaveBeenCalledWith("station-2");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is tapped", () => {
    const onClose = vi.fn();
    renderSheet({ stations: manyStations(3), onClose });

    fireEvent.click(screen.getByTestId("station-sheet-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without choosing", () => {
    const onClose = vi.fn();
    renderSheet({ stations: manyStations(3), onClose });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores non-Escape keys", () => {
    const onClose = vi.fn();
    renderSheet({ stations: manyStations(3), onClose });

    fireEvent.keyDown(document, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("marks the active station with a check", () => {
    renderSheet({ stations: manyStations(3), activeStationId: "station-1" });

    expect(screen.getByTestId("station-sheet-check")).toBeTruthy();
  });
});
