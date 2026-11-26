// @vitest-environment jsdom

import { CardDock } from "@aqui-suena/ui/player-card/components/card-dock";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function renderDock(overrides: Partial<Parameters<typeof CardDock>[0]> = {}) {
  return renderWithProviders(
    <CardDock
      stationName="Aquí Suena"
      listeners={42}
      status="playing"
      onResume={() => {}}
      onPause={() => {}}
      {...overrides}
    />,
    { locale: "en" },
  );
}

describe("CardDock", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the dock with the station name and listener count", () => {
    renderDock();

    expect(screen.getByTestId("player-dock")).toBeTruthy();
    expect(screen.getByText("Aquí Suena")).toBeTruthy();
    expect(screen.getByText(/42 listening/)).toBeTruthy();
  });

  it("shows the down chevron when closed and the up chevron when open", () => {
    renderDock({ sheetOpen: false });
    expect(screen.getByTestId("station-chevron").textContent).toBe("▾");

    cleanup();
    renderDock({ sheetOpen: true });
    expect(screen.getByTestId("station-chevron").textContent).toBe("▴");
  });

  it("opens the sheet from the station button", () => {
    const onOpenSheet = vi.fn();
    renderDock({ onOpenSheet });

    fireEvent.click(screen.getByTestId("station-name"));

    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });

  it("renders the position toggle only when onTogglePosition is provided", () => {
    renderDock();
    expect(screen.queryByRole("button", { name: "Move player up or down" })).toBeNull();

    cleanup();
    renderDock({ onTogglePosition: () => {} });
    expect(screen.getByRole("button", { name: "Move player up or down" })).toBeTruthy();
  });
});
