// @vitest-environment jsdom
import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel/ads-carousel";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ITEMS: readonly AdsCarouselItem[] = [
  {
    id: "a",
    imageUrl: "https://example.com/a.png",
    alt: "Ad A",
    name: "Desayunos Casa Rosa",
    category: "food",
    delivery: true,
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

  it("composes the meta line (category · delivery · opensAt)", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    expect(screen.getByText("Comida · Servicio a domicilio · Abre 8:00")).toBeTruthy();
  });

  it("localizes the category and opening time", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "en" });
    expect(screen.getByText("Food · Home delivery · Opens 8:00")).toBeTruthy();
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

  it("renders the image with cover fit", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const img = screen.getByAltText("Ad A") as HTMLImageElement;
    expect(window.getComputedStyle(img).objectFit).toBe("cover");
  });
});
