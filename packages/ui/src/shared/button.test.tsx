// @vitest-environment jsdom

import { SharedButton } from "@aqui-suena/ui/shared/button";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("SharedButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the title and uses it as the accessible label", () => {
    renderWithProviders(<SharedButton title="Click me" />);

    expect(screen.getByRole("button", { name: "Click me" })).toBeTruthy();
  });

  it("uses the accessibility label when provided", () => {
    renderWithProviders(<SharedButton title="Click me" accessibilityLabel="Do the thing" />);

    expect(screen.getByRole("button", { name: "Do the thing" })).toBeTruthy();
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPress = vi.fn();
    renderWithProviders(<SharedButton title="Click me" onPress={onPress} />);

    fireEvent.click(screen.getByRole("button", { name: "Click me" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
