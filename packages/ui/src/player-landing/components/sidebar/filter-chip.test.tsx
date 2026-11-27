// @vitest-environment jsdom

import { FilterChip } from "@aqui-suena/ui/player-landing/components/sidebar/filter-chip";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("FilterChip", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the label and reflects the selected state", () => {
    renderWithProviders(<FilterChip filter="all" label="All" selected onSelect={() => {}} />);

    expect(screen.getByTestId("landing-filter-all").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("All")).toBeTruthy();
  });

  it("reports unselected chips as not pressed", () => {
    renderWithProviders(
      <FilterChip filter="all" label="All" selected={false} onSelect={() => {}} />,
    );

    expect(screen.getByTestId("landing-filter-all").getAttribute("aria-pressed")).toBe("false");
  });

  it("selects its filter when clicked", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <FilterChip filter="delivery" label="Delivery" selected={false} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByTestId("landing-filter-delivery"));

    expect(onSelect).toHaveBeenCalledWith("delivery");
  });
});
