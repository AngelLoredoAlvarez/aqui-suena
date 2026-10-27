// @vitest-environment jsdom
import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdsCarousel } from "./ads-carousel";

const ITEMS: readonly AdsCarouselItem[] = [
  {
    id: "a",
    imageUrl: "https://example.com/a.png",
    alt: "Ad A",
    name: "Desayunos Casa Rosa",
    category: "Comida",
    delivery: true,
    opensLabel: "Abre 8:00",
    isOpen: true,
  },
  {
    id: "b",
    imageUrl: "https://example.com/b.png",
    alt: "Ad B",
    name: "Dental Sonrisa",
    category: "Salud",
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

  it("composes the meta line (category · delivery · opensLabel)", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });
    expect(screen.getByText("Comida · Servicio a domicilio · Abre 8:00")).toBeTruthy();
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

  it("renders one dot per item, marking the active one, with a group label", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const dots = screen.getAllByTestId("ads-carousel-dot");
    expect(dots).toHaveLength(ITEMS.length);

    expect(dots[0]?.getAttribute("data-active")).toBe("true");
    expect(dots[1]?.getAttribute("data-active")).toBeNull();

    expect(screen.getByRole("group", { name: "Anuncio 1 de 2" })).toBeTruthy();
  });

  it("renders the image with cover fit", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const img = screen.getByAltText("Ad A") as HTMLImageElement;
    expect(window.getComputedStyle(img).objectFit).toBe("cover");
  });
});
