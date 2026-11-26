// @vitest-environment jsdom

import { StationButton } from "@aqui-suena/ui/player-card/components/station-button";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("StationButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the station name and chevron with the change-station label", () => {
    renderWithProviders(
      <StationButton
        stationName="Aquí Suena"
        ariaLabel="Change station, current: Aquí Suena"
        chevron="▾"
        onOpenSheet={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Change station, current: Aquí Suena" }),
    ).toBeTruthy();
    expect(screen.getByText("Aquí Suena")).toBeTruthy();
    expect(screen.getByTestId("station-chevron").textContent).toBe("▾");
  });

  it("calls onOpenSheet when pressed", () => {
    const onOpenSheet = vi.fn();
    renderWithProviders(
      <StationButton
        stationName="Aquí Suena"
        ariaLabel="Change station"
        chevron="▾"
        onOpenSheet={onOpenSheet}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change station" }));

    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });
});
