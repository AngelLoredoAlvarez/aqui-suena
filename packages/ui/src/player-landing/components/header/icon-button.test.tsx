// @vitest-environment jsdom

import { IconButton } from "@aqui-suena/ui/player-landing/components/header/icon-button";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("IconButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the menu icon with the given label and testID", () => {
    renderWithProviders(<IconButton testID="landing-menu" label="Open menu" icon="menu" />);

    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(screen.getByTestId("landing-menu")).toBeTruthy();
  });

  it("renders the sun icon for the theme toggle", () => {
    renderWithProviders(<IconButton testID="landing-theme" label="Change theme" icon="sun" />);

    expect(screen.getByRole("button", { name: "Change theme" })).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPress = vi.fn();
    renderWithProviders(
      <IconButton testID="landing-menu" label="Open menu" icon="menu" onPress={onPress} />,
    );

    fireEvent.click(screen.getByTestId("landing-menu"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
