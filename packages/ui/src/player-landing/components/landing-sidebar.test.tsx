// @vitest-environment jsdom

import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { LandingSidebar } from "@aqui-suena/ui/player-landing/components/landing-sidebar";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const ITEMS: readonly [AdsCarouselItem, AdsCarouselItem] = [
  {
    id: "a",
    imageUrl: "https://example.com/a.png",
    alt: "Ad A",
    name: "Casa Rosa",
    category: "food",
    delivery: true,
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

function renderSidebar(items: readonly AdsCarouselItem[] = ITEMS, width = 380) {
  return renderWithProviders(<LandingSidebar items={items} width={width} />, { locale: "en" });
}

describe("LandingSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the search pill, filters and business cards", () => {
    renderSidebar();

    expect(screen.getByTestId("landing-sidebar")).toBeTruthy();
    expect(screen.getByTestId("landing-search")).toBeTruthy();
    expect(screen.getByText("Businesses")).toBeTruthy();
    expect(screen.getByTestId("business-card-a")).toBeTruthy();
    expect(screen.getByTestId("business-card-b")).toBeTruthy();
  });

  it("renders a filter chip per present category plus all/open/delivery", () => {
    renderSidebar();

    expect(screen.getByTestId("landing-filter-all")).toBeTruthy();
    expect(screen.getByTestId("landing-filter-category:food")).toBeTruthy();
    expect(screen.getByTestId("landing-filter-category:health")).toBeTruthy();
    expect(screen.getByTestId("landing-filter-open")).toBeTruthy();
    expect(screen.getByTestId("landing-filter-delivery")).toBeTruthy();
  });

  it("filters the visible cards by delivery", () => {
    renderSidebar();

    fireEvent.click(screen.getByTestId("landing-filter-delivery"));

    expect(screen.getByTestId("business-card-a")).toBeTruthy();
    expect(screen.queryByTestId("business-card-b")).toBeNull();
  });

  it("filters the visible cards by category", () => {
    renderSidebar();

    fireEvent.click(screen.getByTestId("landing-filter-category:health"));

    expect(screen.queryByTestId("business-card-a")).toBeNull();
    expect(screen.getByTestId("business-card-b")).toBeTruthy();
  });

  it("dedupes items with the same id", () => {
    const item = ITEMS[0];
    renderSidebar([item, item]);

    expect(screen.getAllByTestId(/business-card-/)).toHaveLength(1);
  });

  it("renders the footer legal links", () => {
    renderSidebar();

    expect(screen.getByText("Privacy notice")).toBeTruthy();
    expect(screen.getByText("Terms and conditions")).toBeTruthy();
    expect(screen.getByText("Report content")).toBeTruthy();
  });
});
