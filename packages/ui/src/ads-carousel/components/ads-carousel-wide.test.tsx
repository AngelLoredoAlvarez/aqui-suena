// @vitest-environment jsdom

import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel/components/ads-carousel";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("tamagui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("tamagui")>();

  return {
    ...actual,
    useMedia: () => ({ md: true, lg: true, xl: true }),
  };
});

const ITEM: AdsCarouselItem = {
  id: "a",
  imageUrl: "https://example.com/a.png",
  alt: "Ad A",
  name: "Desayunos Casa Rosa",
  category: "food",
  delivery: true,
  plan: "commerce",
  isOpen: true,
  phone: "487 107 8749",
  address: "Calle Hidalgo 214, Centro, Rioverde",
};

describe("AdsCarousel wide details", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the contact list scrollable and the actions outside the scroll area", () => {
    renderWithProviders(<AdsCarousel items={[ITEM]} />, { locale: "es" });

    const scroll = screen.getByTestId("ads-carousel-details-scroll");

    expect(scroll.classList.contains("hover-reveal-scroll")).toBe(true);
    expect(scroll.contains(screen.getByText("Teléfono"))).toBe(true);
    expect(scroll.contains(screen.getByText("Ver negocio"))).toBe(false);
    expect(scroll.contains(screen.getByText("Llamar"))).toBe(false);
    expect(scroll.contains(screen.getByText("Cómo llegar"))).toBe(false);
  });

  it.each(["trades", "commerce"] as const)("shows the Ver negocio CTA for the %s plan", (plan) => {
    renderWithProviders(<AdsCarousel items={[{ ...ITEM, plan }]} />, { locale: "es" });

    expect(screen.getByText("Ver negocio")).toBeTruthy();
  });

  it("hides the Ver negocio CTA for the community plan", () => {
    renderWithProviders(<AdsCarousel items={[{ ...ITEM, plan: "community" }]} />, {
      locale: "es",
    });

    expect(screen.queryByText("Ver negocio")).toBeNull();
    expect(screen.getByText("Llamar")).toBeTruthy();
    expect(screen.getByText("Teléfono")).toBeTruthy();
  });
});
