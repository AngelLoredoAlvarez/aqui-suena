// @vitest-environment jsdom

import { downloadFlyer } from "@aqui-suena/ui/flyer-lightbox/download-flyer";
import { FlyerLightbox } from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@aqui-suena/ui/flyer-lightbox/download-flyer", () => ({
  downloadFlyer: vi.fn(async () => undefined),
}));

const ITEM = {
  id: "a",
  imageUrl: "https://example.com/a.png",
  alt: "Ad A",
  name: "El Sazón de Ale",
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

  it("renders the zoom and download actions", () => {
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={() => {}} />, { locale: "es" });

    expect(screen.getByTestId("flyer-lightbox-menu")).toBeTruthy();
    expect(screen.getByLabelText("Acercar")).toBeTruthy();
    expect(screen.getByLabelText("Alejar")).toBeTruthy();
    expect(screen.getByLabelText("Restablecer zoom")).toBeTruthy();
    expect(screen.getByLabelText("Descargar flyer")).toBeTruthy();
  });

  it("zooms and resets from the floating menu", () => {
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={() => {}} />, { locale: "es" });
    const scale = () => screen.getByTestId("zoomable-image-content").getAttribute("data-scale");

    fireEvent.click(screen.getByTestId("flyer-zoom-out"));
    expect(scale()).toBe("1");

    fireEvent.click(screen.getByTestId("flyer-zoom-in"));
    expect(scale()).toBe("1.5");

    fireEvent.click(screen.getByTestId("flyer-zoom-reset"));
    expect(scale()).toBe("1");
  });

  it("downloads the flyer with the business name", async () => {
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={() => {}} />, { locale: "es" });

    fireEvent.click(screen.getByTestId("flyer-download"));

    await waitFor(() => {
      expect(downloadFlyer).toHaveBeenCalledWith("https://example.com/a.png", "El Sazón de Ale");
    });
  });

  it("resets the zoom when the flyer changes", () => {
    const { rerender } = renderWithProviders(<FlyerLightbox item={ITEM} onClose={() => {}} />, {
      locale: "es",
    });

    fireEvent.doubleClick(screen.getByTestId("zoomable-image"));
    expect(screen.getByTestId("zoomable-image-content").getAttribute("data-scale")).toBe("2");

    rerender(
      <FlyerLightbox
        item={{
          id: "b",
          imageUrl: "https://example.com/b.png",
          alt: "Ad B",
          name: "Dental Sonrisa",
        }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByTestId("zoomable-image-content").getAttribute("data-scale")).toBe("1");
  });
});
