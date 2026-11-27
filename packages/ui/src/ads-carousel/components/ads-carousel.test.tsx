// @vitest-environment jsdom
import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel/components/ads-carousel";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { Theme } from "tamagui";
import { afterEach, describe, expect, it, vi } from "vitest";

const prefetchImages = vi.hoisted(() => vi.fn());

vi.mock("@aqui-suena/ui/optimized-image/use-image-prefetch", () => ({
  useImagePrefetch: prefetchImages,
}));

const ITEMS: readonly AdsCarouselItem[] = [
  {
    id: "a",
    imageUrl: "https://example.com/a.png",
    alt: "Ad A",
    name: "Desayunos Casa Rosa",
    category: "food",
    delivery: true,
    plan: "commerce",
    opensAt: "8:00",
    isOpen: true,
  },
  {
    id: "b",
    imageUrl: "https://example.com/b.png",
    alt: "Ad B",
    name: "Dental Sonrisa",
    category: "health",
    delivery: false,
    plan: "trades",
    isOpen: false,
  },
];

describe("AdsCarousel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows the designed empty state when there are no items", () => {
    renderWithProviders(<AdsCarousel />, { locale: "es" });
    expect(screen.getByTestId("ads-carousel-placeholder")).toBeTruthy();
    expect(screen.getByText("Aún no hay negocios patrocinados")).toBeTruthy();
    expect(screen.getByText("Vuelve pronto: aquí verás los negocios cerca de ti.")).toBeTruthy();
  });

  it("renders the first item image and name", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    expect(screen.getByTestId("ads-carousel")).toBeTruthy();
    expect(screen.getByAltText("Ad A")).toBeTruthy();
    expect(screen.getByText("Desayunos Casa Rosa")).toBeTruthy();
  });

  it("composes the mobile meta line (category · opensAt)", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    expect(screen.getByText("Comida · Abre 8:00")).toBeTruthy();
  });

  it("localizes the category and opening time", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "en" });
    expect(screen.getByText("Food · Opens 8:00")).toBeTruthy();
  });

  it("renders the delivery chip in the flyer only when the business delivers", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const flyer = screen.getByRole("group", { name: "Anuncio 1 de 2" });
    expect(within(flyer).getByTestId("ads-carousel-delivery-badge")).toBeTruthy();
    expect(within(flyer).getByText("A domicilio")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Anuncio siguiente" }));
    expect(screen.queryByTestId("ads-carousel-delivery-badge")).toBeNull();
    expect(screen.getByText("Cerrado")).toBeTruthy();
  });

  it("keeps the delivery chip under the light theme", () => {
    renderWithProviders(
      <Theme name="brasa">
        <AdsCarousel items={ITEMS} />
      </Theme>,
      { locale: "es" },
    );

    expect(screen.getByTestId("ads-carousel-delivery-badge")).toBeTruthy();
    expect(screen.getByText("A domicilio")).toBeTruthy();
  });

  it("renders the open-status badge from isOpen", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    expect(screen.getByText("Abierto")).toBeTruthy();
  });

  it("renders the view-business CTA", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    expect(screen.getByText("Ver negocio")).toBeTruthy();
  });

  it("auto-advances to the next item and flips the badge", () => {
    vi.useFakeTimers();
    renderWithProviders(<AdsCarousel items={ITEMS} autoAdvanceMs={100} />, { locale: "es" });
    expect(screen.getByAltText("Ad A")).toBeTruthy();

    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByAltText("Ad B")).toBeTruthy();
    expect(screen.getByText("Cerrado")).toBeTruthy();
  });

  it("pauses auto-advance on mouse enter", () => {
    vi.useFakeTimers();
    renderWithProviders(<AdsCarousel items={ITEMS} autoAdvanceMs={100} />, { locale: "es" });
    const carousel = screen.getByTestId("ads-carousel");

    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByAltText("Ad A")).toBeTruthy();

    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByAltText("Ad B")).toBeTruthy();
  });

  it("renders one flyer group per visible item and labels the current one", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    expect(screen.getByRole("group", { name: "Anuncio 1 de 2" })).toBeTruthy();
  });

  it("navigates with the previous and next buttons", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    fireEvent.click(screen.getByRole("button", { name: "Anuncio siguiente" }));
    expect(screen.getByAltText("Ad B")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Anuncio anterior" }));
    expect(screen.getByAltText("Ad A")).toBeTruthy();
  });

  it("wraps around with the navigation buttons", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    fireEvent.click(screen.getByRole("button", { name: "Anuncio anterior" }));
    expect(screen.getByAltText("Ad B")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Anuncio siguiente" }));
    expect(screen.getByAltText("Ad A")).toBeTruthy();
  });

  it("hides the navigation buttons for a single flyer", () => {
    renderWithProviders(<AdsCarousel items={ITEMS.slice(0, 1)} />, { locale: "es" });

    expect(screen.queryByRole("button", { name: "Anuncio anterior" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Anuncio siguiente" })).toBeNull();
  });

  it("navigates with a horizontal drag", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const carousel = screen.getByTestId("ads-carousel");

    fireEvent.pointerDown(carousel, { clientX: 220, clientY: 120 });
    fireEvent.pointerMove(carousel, { clientX: 120, clientY: 124 });

    expect(screen.getByAltText("Ad B")).toBeTruthy();
  });

  it("prefetches the adjacent flyer while the current one is visible", () => {
    prefetchImages.mockClear();

    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    expect(prefetchImages).toHaveBeenLastCalledWith([ITEMS[1]?.imageUrl]);

    fireEvent.click(screen.getByRole("button", { name: "Anuncio siguiente" }));

    expect(prefetchImages).toHaveBeenLastCalledWith([ITEMS[0]?.imageUrl]);
  });

  it("remounts the flyer layer so the change runs its transition", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    const firstLayer = screen.getByTestId("ads-carousel-flyer-layer");

    fireEvent.click(screen.getByRole("button", { name: "Anuncio siguiente" }));

    const secondLayer = screen.getByTestId("ads-carousel-flyer-layer");
    expect(secondLayer).not.toBe(firstLayer);
  });

  it("restarts auto-advance after a manual drag", () => {
    vi.useFakeTimers();
    renderWithProviders(<AdsCarousel items={ITEMS} autoAdvanceMs={100} />, { locale: "es" });

    const carousel = screen.getByTestId("ads-carousel");

    act(() => vi.advanceTimersByTime(50));

    fireEvent.pointerDown(carousel, { clientX: 220, clientY: 120 });
    fireEvent.pointerMove(carousel, { clientX: 120, clientY: 124 });
    fireEvent.pointerUp(carousel, { clientX: 120, clientY: 124 });

    expect(screen.getByAltText("Ad B")).toBeTruthy();

    act(() => vi.advanceTimersByTime(60));
    expect(screen.getByAltText("Ad B")).toBeTruthy();

    act(() => vi.advanceTimersByTime(40));
    expect(screen.getByAltText("Ad A")).toBeTruthy();
  });

  it("renders the whole flyer with contain fit", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const img = screen.getByAltText("Ad A") as HTMLImageElement;
    expect(window.getComputedStyle(img).objectFit).toBe("contain");
  });

  it("opens the fullscreen flyer from the image", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    fireEvent.click(screen.getByTestId("ads-carousel-open-flyer"));

    const lightbox = screen.getByTestId("flyer-lightbox");

    expect(within(lightbox).getByAltText("Ad A")).toBeTruthy();
    expect(within(lightbox).getByLabelText("Cerrar flyer")).toBeTruthy();
  });

  it("closes the fullscreen flyer with Escape", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    fireEvent.click(screen.getByTestId("ads-carousel-open-flyer"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("flyer-lightbox")).toBeNull();
  });

  it("does not open the fullscreen flyer after a swipe", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    const carousel = screen.getByTestId("ads-carousel");

    fireEvent.pointerDown(carousel, { clientX: 220, clientY: 120 });
    fireEvent.pointerMove(carousel, { clientX: 120, clientY: 124 });
    fireEvent.pointerUp(carousel, { clientX: 120, clientY: 124 });
    fireEvent.click(screen.getByTestId("ads-carousel-open-flyer"));

    expect(screen.queryByTestId("flyer-lightbox")).toBeNull();
  });
});
