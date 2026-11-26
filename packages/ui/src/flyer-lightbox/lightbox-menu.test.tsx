// @vitest-environment jsdom

import { FlyerLightboxMenu } from "@aqui-suena/ui/flyer-lightbox/lightbox-menu";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function renderMenu(overrides: Partial<Parameters<typeof FlyerLightboxMenu>[0]> = {}) {
  return renderWithProviders(
    <FlyerLightboxMenu
      scale={1}
      bottom={0}
      downloading={false}
      onZoomIn={() => {}}
      onZoomOut={() => {}}
      onReset={() => {}}
      onDownload={() => {}}
      {...overrides}
    />,
    { locale: "en" },
  );
}

describe("FlyerLightboxMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the four menu actions", () => {
    renderMenu();

    expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset zoom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download flyer" })).toBeTruthy();
  });

  it("disables zoom out and reset at the minimum scale", () => {
    renderMenu({ scale: 1 });

    expect(
      screen.getByRole("button", { name: "Zoom out" }).getAttribute("disabled"),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Reset zoom" }).getAttribute("disabled"),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("disabled")).toBeNull();
  });

  it("disables zoom in at the maximum scale", () => {
    renderMenu({ scale: 3 });

    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("disabled")).not.toBeNull();
  });

  it("disables download while downloading", () => {
    renderMenu({ downloading: true });

    expect(
      screen.getByRole("button", { name: "Download flyer" }).getAttribute("disabled"),
    ).not.toBeNull();
  });

  it("calls the matching callback when an enabled action is pressed", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onReset = vi.fn();
    const onDownload = vi.fn();

    renderWithProviders(
      <FlyerLightboxMenu
        scale={2}
        bottom={0}
        downloading={false}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onReset={onReset}
        onDownload={onDownload}
      />,
      { locale: "en" },
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    fireEvent.click(screen.getByRole("button", { name: "Download flyer" }));

    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
