// @vitest-environment jsdom

import { SearchPill } from "@aqui-suena/ui/player-landing/components/search-pill";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("SearchPill", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the search pill with the search aria label", () => {
    renderWithProviders(<SearchPill />, { locale: "en" });

    expect(screen.getByTestId("landing-search")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Search businesses by name, category, or product",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Search")).toBeTruthy();
  });

  it("renders the compact variant", () => {
    renderWithProviders(<SearchPill size="sm" />, { locale: "en" });

    expect(screen.getByTestId("landing-search")).toBeTruthy();
    expect(screen.getByText("Search")).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPress = vi.fn();
    renderWithProviders(<SearchPill onPress={onPress} />, { locale: "en" });

    fireEvent.click(screen.getByTestId("landing-search"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
