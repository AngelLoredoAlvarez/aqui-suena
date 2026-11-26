// @vitest-environment jsdom

import { useEscapeToClose } from "@aqui-suena/ui/station-sheet/use-escape-to-close";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("useEscapeToClose", () => {
  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(true, onClose));

    act(() => pressKey("Escape"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignores keys other than Escape", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(true, onClose));

    act(() => pressKey("Enter"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does nothing while closed", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(false, onClose));

    act(() => pressKey("Escape"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(true, onClose));

    unmount();

    act(() => pressKey("Escape"));

    expect(onClose).not.toHaveBeenCalled();
  });
});
