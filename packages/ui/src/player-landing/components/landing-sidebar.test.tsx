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
    plan: "community",
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

  it("shows the custom scrollbar only while hovering the list", () => {
    renderSidebar();

    const scroll = screen.getByTestId("landing-sidebar-scroll") as HTMLElement;
    Object.defineProperty(scroll, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(scroll, "scrollHeight", { configurable: true, value: 600 });
    fireEvent.scroll(scroll);

    const area = screen.getByTestId("landing-sidebar-scroll-area");
    const thumb = screen.getByTestId("landing-sidebar-scroll-thumb");

    expect(scroll.classList.contains("hide-native-scrollbar")).toBe(true);
    expect(thumb.getAttribute("data-visible")).toBe("false");

    fireEvent(area, new Event("pointerenter"));
    expect(thumb.getAttribute("data-visible")).toBe("true");

    fireEvent(area, new Event("pointerleave"));
    expect(thumb.getAttribute("data-visible")).toBe("false");
  });

  it("keeps the filter chips on one horizontally scrollable row", () => {
    renderSidebar();

    const scroll = screen.getByTestId("landing-sidebar-filters-scroll") as HTMLElement;
    Object.defineProperty(scroll, "clientWidth", { configurable: true, value: 300 });
    Object.defineProperty(scroll, "scrollWidth", { configurable: true, value: 700 });
    fireEvent.scroll(scroll);

    expect(scroll.classList.contains("hide-native-scrollbar")).toBe(true);
    expect(getComputedStyle(scroll).flexDirection).toBe("row");

    for (const filter of ["all", "category:food", "category:health", "open", "delivery"]) {
      expect(scroll.contains(screen.getByTestId(`landing-filter-${filter}`))).toBe(true);
    }

    const area = screen.getByTestId("landing-sidebar-filters-scroll-area");
    const thumb = screen.getByTestId("landing-sidebar-filters-scroll-thumb");

    fireEvent(area, new Event("pointerenter"));
    expect(thumb.getAttribute("data-visible")).toBe("true");

    fireEvent(area, new Event("pointerleave"));
    expect(thumb.getAttribute("data-visible")).toBe("false");
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
