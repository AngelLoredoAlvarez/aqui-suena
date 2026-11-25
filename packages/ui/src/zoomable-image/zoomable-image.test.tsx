// @vitest-environment jsdom

import { UiProvider } from "@aqui-suena/ui/shared";
import type { ZoomableImageHandle } from "@aqui-suena/ui/zoomable-image/types";
import { ZoomableImage } from "@aqui-suena/ui/zoomable-image/zoomable-image";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

function wrapper({ children }: { children: ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}

function surface(): HTMLElement {
  return screen.getByTestId("zoomable-image");
}

function content(): HTMLElement {
  return screen.getByTestId("zoomable-image-content");
}

function scale(): string | null {
  return content().getAttribute("data-scale");
}

function offset(): string | null {
  return content().getAttribute("data-offset");
}

function renderZoomable(onTap?: () => void): void {
  render(
    <ZoomableImage onTap={onTap}>
      <div>flyer</div>
    </ZoomableImage>,
    { wrapper },
  );
}

describe("ZoomableImage (web)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts at the base scale and centered", () => {
    renderZoomable();

    expect(scale()).toBe("1");
    expect(offset()).toBe("0,0");
  });

  it("zooms with ctrl + wheel and ignores a plain wheel", () => {
    renderZoomable();

    fireEvent.wheel(surface(), { deltaY: -100 });
    expect(scale()).toBe("1");

    fireEvent.wheel(surface(), { deltaY: -100, ctrlKey: true });
    expect(scale()).toBe("1.2");

    fireEvent.wheel(surface(), { deltaY: 100, ctrlKey: true });
    expect(scale()).toBe("1");
  });

  it("never leaves the 1x-3x range", () => {
    renderZoomable();

    for (let step = 0; step < 20; step += 1) {
      fireEvent.wheel(surface(), { deltaY: -100, ctrlKey: true });
    }

    expect(scale()).toBe("3");
  });

  it("toggles 1x and 2x on double click", () => {
    renderZoomable();

    fireEvent.doubleClick(surface());
    expect(scale()).toBe("2");

    fireEvent.doubleClick(surface());
    expect(scale()).toBe("1");
  });

  it("zooms with the keyboard and resets with 0", () => {
    renderZoomable();

    fireEvent.keyDown(window, { key: "+" });
    expect(scale()).toBe("1.5");

    fireEvent.keyDown(window, { key: "0" });
    expect(scale()).toBe("1");
  });

  it("pans while zoomed and clamps to the viewport", () => {
    renderZoomable();
    vi.spyOn(surface(), "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 800,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 800,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.doubleClick(surface());
    fireEvent.pointerDown(surface(), { clientX: 200, clientY: 400 });
    fireEvent.pointerMove(window, { clientX: 260, clientY: 340 });

    expect(offset()).toBe("60,-60");

    fireEvent.pointerMove(window, { clientX: 900, clientY: 1400 });
    expect(offset()).toBe("200,400");

    fireEvent.pointerUp(window);
    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 });
    expect(offset()).toBe("200,400");
  });

  it("does not pan at the base scale", () => {
    renderZoomable();

    fireEvent.pointerDown(surface(), { clientX: 200, clientY: 400 });
    fireEvent.pointerMove(window, { clientX: 260, clientY: 340 });

    expect(offset()).toBe("0,0");
  });

  it("reports a tap once the double-tap window closes", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    renderZoomable(onTap);

    fireEvent.click(surface());
    expect(onTap).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("zooms on double click instead of reporting a tap", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    renderZoomable(onTap);

    fireEvent.click(surface());
    fireEvent.doubleClick(surface());

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(scale()).toBe("2");
    expect(onTap).not.toHaveBeenCalled();
  });

  it("exposes zoom actions through its handle and reports scale changes", () => {
    const ref = createRef<ZoomableImageHandle>();
    const onScaleChange = vi.fn();

    render(
      <ZoomableImage ref={ref} onScaleChange={onScaleChange}>
        <div>flyer</div>
      </ZoomableImage>,
      { wrapper },
    );

    act(() => ref.current?.zoomIn());

    expect(scale()).toBe("1.5");

    act(() => ref.current?.zoomOut());

    expect(scale()).toBe("1");

    act(() => ref.current?.zoomIn());
    act(() => ref.current?.reset());

    expect(scale()).toBe("1");
    expect(onScaleChange).toHaveBeenLastCalledWith(1);
  });

  it("does not report a tap after dragging", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    renderZoomable(onTap);

    fireEvent.doubleClick(surface());
    fireEvent.pointerDown(surface(), { clientX: 200, clientY: 400 });
    fireEvent.pointerMove(window, { clientX: 260, clientY: 340 });
    fireEvent.pointerUp(window);
    fireEvent.click(surface());

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onTap).not.toHaveBeenCalled();
  });
});
