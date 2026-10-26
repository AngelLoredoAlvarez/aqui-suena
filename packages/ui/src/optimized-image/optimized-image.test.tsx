// @vitest-environment jsdom
import { UiProvider } from "@aqui-suena/ui/shared";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptimizedImage } from "./optimized-image";

function wrapper({ children }: { children: ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}

describe("OptimizedImage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    // @ts-expect-error cleanup
    delete global.IntersectionObserver;
  });

  it("renders the container", () => {
    render(
      <OptimizedImage src="https://example.com/img.png" alt="test" width={100} height={100} />,
      { wrapper },
    );
    expect(screen.getByTestId("optimized-image")).toBeTruthy();
  });

  it("renders the image immediately when priority is set", () => {
    render(
      <OptimizedImage
        src="https://example.com/img.png"
        alt="test"
        width={100}
        height={100}
        priority
      />,
      { wrapper },
    );
    expect(screen.getByAltText("test").getAttribute("src")).toBe("https://example.com/img.png");
  });

  it("renders error fallback on onError", () => {
    render(
      <OptimizedImage
        src="https://example.com/broken.png"
        alt="test"
        width={100}
        height={100}
        priority
      />,
      { wrapper },
    );
    fireEvent.error(screen.getByAltText("test"));
    expect(screen.getByTestId("optimized-image-error")).toBeTruthy();
    expect(screen.queryByAltText("test")).toBeNull();
  });

  it("lazy-loads: renders img only after intersection", () => {
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(callback: IntersectionObserverCallback) {
        cb = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    // @ts-expect-error jsdom
    global.IntersectionObserver = FakeIO;

    render(
      <OptimizedImage src="https://example.com/img.png" alt="test" width={100} height={100} />,
      { wrapper },
    );
    // Not yet in view -> no img
    expect(screen.queryByAltText("test")).toBeNull();

    // Simulate entering viewport
    act(() => {
      cb?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(screen.getByAltText("test")).toBeTruthy();
  });
});
