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

const ITEMS: readonly AdsCarouselItem[] = [
  {
    id: "a",
    imageUrl: "https://example.com/a.png",
    alt: "Ad A",
    name: "Desayunos Casa Rosa",
    category: "food",
    delivery: true,
    isOpen: true,
    phone: "487 107 8749",
    address: "Calle Hidalgo 214, Centro, Rioverde",
  },
];

describe("AdsCarousel wide details", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the contact list scrollable and the actions outside the scroll area", () => {
    renderWithProviders(<AdsCarousel items={ITEMS} />, { locale: "es" });

    const scroll = screen.getByTestId("ads-carousel-details-scroll");

    expect(scroll.contains(screen.getByText("Teléfono"))).toBe(true);
    expect(scroll.contains(screen.getByText("Ver negocio"))).toBe(false);
    expect(scroll.contains(screen.getByText("Llamar"))).toBe(false);
    expect(scroll.contains(screen.getByText("Cómo llegar"))).toBe(false);
  });
});
