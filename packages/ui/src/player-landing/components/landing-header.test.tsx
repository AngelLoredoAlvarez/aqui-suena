// @vitest-environment jsdom

import { LandingHeader } from "@aqui-suena/ui/player-landing/components/landing-header";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("LandingHeader", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the compact mobile variant without the app title or theme toggle", () => {
    renderWithProviders(<LandingHeader variant="mobile" />, { locale: "en" });

    expect(screen.getByTestId("landing-header")).toBeTruthy();
    expect(screen.getByTestId("landing-search")).toBeTruthy();
    expect(screen.getByTestId("landing-assistant")).toBeTruthy();
    expect(screen.getByTestId("landing-language")).toBeTruthy();
    expect(screen.getByTestId("landing-menu")).toBeTruthy();
    expect(screen.queryByText("Aquí Suena")).toBeNull();
    expect(screen.queryByTestId("landing-brand-mark")).toBeNull();
    expect(screen.queryByTestId("landing-theme")).toBeNull();
  });

  it("renders the web variant with the app title, theme toggle and my-businesses button", () => {
    renderWithProviders(<LandingHeader variant="web" />, { locale: "en" });

    expect(screen.getByText("Aquí Suena")).toBeTruthy();
    expect(screen.getByTestId("landing-brand-mark")).toBeTruthy();
    expect(screen.getByTestId("landing-theme")).toBeTruthy();
    expect(screen.getByTestId("landing-my-businesses")).toBeTruthy();
    expect(screen.queryByTestId("landing-menu")).toBeNull();
  });

  it("renders the tablet variant with the app title and a menu button but no theme toggle", () => {
    renderWithProviders(<LandingHeader variant="tablet" />, { locale: "en" });

    expect(screen.getByText("Aquí Suena")).toBeTruthy();
    expect(screen.getByTestId("landing-brand-mark")).toBeTruthy();
    expect(screen.getByTestId("landing-menu")).toBeTruthy();
    expect(screen.queryByTestId("landing-theme")).toBeNull();
    expect(screen.queryByTestId("landing-my-businesses")).toBeNull();
  });

  it("opens search and the menu from the mobile variant", () => {
    const onOpenSearch = vi.fn();
    const onOpenMenu = vi.fn();
    renderWithProviders(
      <LandingHeader variant="mobile" onOpenSearch={onOpenSearch} onOpenMenu={onOpenMenu} />,
      { locale: "en" },
    );

    fireEvent.click(screen.getByTestId("landing-search"));
    fireEvent.click(screen.getByTestId("landing-menu"));

    expect(onOpenSearch).toHaveBeenCalledTimes(1);
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it("forwards the assistant, theme and my-businesses callbacks in the web variant", () => {
    const onOpenAssistant = vi.fn();
    const onToggleTheme = vi.fn();
    const onOpenMyBusinesses = vi.fn();
    renderWithProviders(
      <LandingHeader
        variant="web"
        onOpenAssistant={onOpenAssistant}
        onToggleTheme={onToggleTheme}
        onOpenMyBusinesses={onOpenMyBusinesses}
      />,
      { locale: "en" },
    );

    fireEvent.click(screen.getByTestId("landing-assistant"));
    fireEvent.click(screen.getByTestId("landing-theme"));
    fireEvent.click(screen.getByTestId("landing-my-businesses"));

    expect(onOpenAssistant).toHaveBeenCalledTimes(1);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
    expect(onOpenMyBusinesses).toHaveBeenCalledTimes(1);
  });
});
