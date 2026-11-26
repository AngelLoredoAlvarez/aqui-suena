// @vitest-environment jsdom

import { useCarouselDrag } from "@aqui-suena/ui/ads-carousel/use-carousel-drag";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function eventAt(x: number, y: number) {
  return { nativeEvent: { clientX: x, clientY: y } };
}

describe("useCarouselDrag", () => {
  function setup() {
    const navigate = { previous: vi.fn(), next: vi.fn() };
    const { result } = renderHook(() => useCarouselDrag(navigate));
    return { navigate, result };
  }

  it("navigates next on a leftward swipe past the threshold", () => {
    const { navigate, result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(-120, 4)));

    expect(navigate.next).toHaveBeenCalledOnce();
    expect(navigate.previous).not.toHaveBeenCalled();
  });

  it("navigates previous on a rightward swipe past the threshold", () => {
    const { navigate, result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(120, -4)));

    expect(navigate.previous).toHaveBeenCalledOnce();
    expect(navigate.next).not.toHaveBeenCalled();
  });

  it("ignores a drag below the threshold", () => {
    const { navigate, result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(-30, 0)));

    expect(navigate.next).not.toHaveBeenCalled();
    expect(navigate.previous).not.toHaveBeenCalled();
  });

  it("ignores a mostly vertical drag", () => {
    const { navigate, result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(-80, 120)));

    expect(navigate.next).not.toHaveBeenCalled();
    expect(navigate.previous).not.toHaveBeenCalled();
  });

  it("navigates once per gesture even when the drag keeps moving", () => {
    const { navigate, result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(-120, 4)));
    act(() => result.current.handlePointerMove(eventAt(-200, 4)));

    expect(navigate.next).toHaveBeenCalledOnce();
  });

  it("flags dragging during the gesture and clears it on pointer up", () => {
    const { result } = setup();

    expect(result.current.dragging).toBe(false);
    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    expect(result.current.dragging).toBe(true);
    act(() => result.current.handlePointerUp(eventAt(0, 0)));
    expect(result.current.dragging).toBe(false);
  });

  it("keeps the swiped flag set for the whole gesture so the ending click never opens the flyer", () => {
    const { result } = setup();

    expect(result.current.swiped.current).toBe(false);
    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(-120, 4)));
    expect(result.current.swiped.current).toBe(true);
    act(() => result.current.handlePointerUp(eventAt(-120, 4)));
    expect(result.current.swiped.current).toBe(true);
  });

  it("resets the swiped flag on the next pointer down", () => {
    const { result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerMove(eventAt(-120, 4)));
    act(() => result.current.handlePointerUp(eventAt(-120, 4)));
    act(() => result.current.handlePointerDown(eventAt(0, 0)));

    expect(result.current.swiped.current).toBe(false);
  });

  it("cancel and leave stop the gesture without navigating", () => {
    const { navigate, result } = setup();

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerCancel());
    expect(result.current.dragging).toBe(false);

    act(() => result.current.handlePointerDown(eventAt(0, 0)));
    act(() => result.current.handlePointerLeave());
    expect(result.current.dragging).toBe(false);

    expect(navigate.next).not.toHaveBeenCalled();
    expect(navigate.previous).not.toHaveBeenCalled();
  });
});
