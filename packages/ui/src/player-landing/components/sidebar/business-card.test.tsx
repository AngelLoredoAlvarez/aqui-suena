// @vitest-environment jsdom

import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { BusinessCard } from "@aqui-suena/ui/player-landing/components/sidebar/business-card";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ITEM: AdsCarouselItem = {
  id: "a",
  imageUrl: "https://example.com/a.png",
  alt: "Ad A",
  name: "Casa Rosa",
  category: "food",
  delivery: true,
  plan: "community",
  isOpen: true,
};

describe("BusinessCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the initials and name without the business category label", () => {
    renderWithProviders(<BusinessCard item={ITEM} selected={false} />, { locale: "en" });

    expect(screen.getByTestId("business-card-a")).toBeTruthy();
    expect(screen.getByText("CR")).toBeTruthy();
    expect(screen.getByText("Casa Rosa")).toBeTruthy();
    expect(screen.queryByText("Food")).toBeNull();
  });

  it("shrinks a long name to fit the measured width", () => {
    const longName = "Comida Casera con Sabor a Perú";
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 120 } as DOMRect);

    renderWithProviders(<BusinessCard item={{ ...ITEM, name: longName }} selected={false} />, {
      locale: "en",
    });

    rectSpy.mockRestore();

    expect(getComputedStyle(screen.getByText(longName)).fontSize).toBe("8px");
  });

  it("shows the open badge for an open business", () => {
    renderWithProviders(<BusinessCard item={ITEM} selected={false} />, { locale: "en" });

    expect(screen.getByText("Open")).toBeTruthy();
  });

  it("shows the closed badge for a closed business", () => {
    renderWithProviders(<BusinessCard item={{ ...ITEM, isOpen: false }} selected={false} />, {
      locale: "en",
    });

    expect(screen.getByText("Closed")).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPress = vi.fn();
    renderWithProviders(<BusinessCard item={ITEM} selected={false} onPress={onPress} />, {
      locale: "en",
    });

    fireEvent.click(screen.getByTestId("business-card-a"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
