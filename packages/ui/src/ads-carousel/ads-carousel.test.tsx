// @vitest-environment jsdom
import { UiProvider } from "@aqui-suena/ui/shared";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdsCarousel } from "./ads-carousel";

function wrapper({ children }: { children: ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}

const ITEMS = [
  { id: "a", imageUrl: "https://example.com/a.png", alt: "Ad A" },
  { id: "b", imageUrl: "https://example.com/b.png", alt: "Ad B" },
];

describe("AdsCarousel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows placeholder when no items", () => {
    render(<AdsCarousel />, { wrapper });
    expect(screen.getByTestId("ads-carousel-placeholder")).toBeTruthy();
  });

  it("renders the first item image", () => {
    render(<AdsCarousel items={ITEMS} />, { wrapper });
    expect(screen.getByTestId("ads-carousel")).toBeTruthy();
    expect(screen.getByAltText("Ad A")).toBeTruthy();
  });

  it("auto-advances to the next item after the interval", () => {
    vi.useFakeTimers();
    render(<AdsCarousel items={ITEMS} autoAdvanceMs={100} />, { wrapper });
    expect(screen.getByAltText("Ad A")).toBeTruthy();

    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByAltText("Ad B")).toBeTruthy();
  });

  it("pauses auto-advance on mouse enter", () => {
    vi.useFakeTimers();
    render(<AdsCarousel items={ITEMS} autoAdvanceMs={100} />, { wrapper });
    const carousel = screen.getByTestId("ads-carousel");

    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(300));
    // Should still show first item (paused)
    expect(screen.getByAltText("Ad A")).toBeTruthy();

    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByAltText("Ad B")).toBeTruthy();
  });
});
