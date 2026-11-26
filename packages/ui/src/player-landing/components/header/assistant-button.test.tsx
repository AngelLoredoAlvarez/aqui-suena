// @vitest-environment jsdom

import { AssistantButton } from "@aqui-suena/ui/player-landing/components/header/assistant-button";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("AssistantButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a compact icon-only button with the assistant aria label", () => {
    renderWithProviders(<AssistantButton compact onPress={() => {}} />, { locale: "en" });

    const button = screen.getByRole("button", { name: "AI business assistant" });
    expect(button.getAttribute("data-testid")).toBe("landing-assistant");
    expect(screen.queryByText("Assistant")).toBeNull();
  });

  it("renders the labeled button when not compact", () => {
    renderWithProviders(<AssistantButton compact={false} onPress={() => {}} />, { locale: "en" });

    expect(screen.getByRole("button", { name: "AI business assistant" })).toBeTruthy();
    expect(screen.getByText("Assistant")).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPress = vi.fn();
    renderWithProviders(<AssistantButton compact onPress={onPress} />, { locale: "en" });

    fireEvent.click(screen.getByTestId("landing-assistant"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
