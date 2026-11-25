// @vitest-environment jsdom

import { FlyerLightbox } from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ITEM = {
  id: "a",
  imageUrl: "https://example.com/a.png",
  alt: "Ad A",
};

describe("FlyerLightbox", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders nothing without an item", () => {
    renderWithProviders(<FlyerLightbox item={null} onClose={() => {}} />, { locale: "es" });

    expect(screen.queryByTestId("flyer-lightbox")).toBeNull();
  });

  it("shows the flyer in a labelled dialog", () => {
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={() => {}} />, { locale: "es" });

    const dialog = screen.getByTestId("flyer-lightbox");

    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Flyer a pantalla completa");
    expect(screen.getByAltText("Ad A")).toBeTruthy();
    expect(screen.getByLabelText("Cerrar flyer")).toBeTruthy();
  });

  it("closes with Escape", () => {
    const onClose = vi.fn();
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={onClose} />, { locale: "es" });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with the close button", () => {
    const onClose = vi.fn();
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={onClose} />, { locale: "es" });

    fireEvent.click(screen.getByTestId("flyer-lightbox-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a tap over the viewer", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={onClose} />, { locale: "es" });

    fireEvent.click(screen.getByTestId("zoomable-image"));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resets the zoom when the flyer changes", () => {
    const { rerender } = renderWithProviders(<FlyerLightbox item={ITEM} onClose={() => {}} />, {
      locale: "es",
    });

    fireEvent.doubleClick(screen.getByTestId("zoomable-image"));
    expect(screen.getByTestId("zoomable-image-content").getAttribute("data-scale")).toBe("2");

    rerender(
      <FlyerLightbox
        item={{ id: "b", imageUrl: "https://example.com/b.png", alt: "Ad B" }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByTestId("zoomable-image-content").getAttribute("data-scale")).toBe("1");
  });
});
