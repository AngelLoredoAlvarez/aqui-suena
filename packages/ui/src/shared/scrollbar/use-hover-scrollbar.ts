import {
  computeThumbGeometry,
  type ThumbGeometry,
} from "@aqui-suena/ui/shared/scrollbar/compute-thumb";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { isWeb, type TamaguiElement } from "tamagui";

export type ScrollbarOrientation = "vertical" | "horizontal";

type DragState = {
  readonly pointer: number;
  readonly scroll: number;
};

function asDomElement(node: unknown): HTMLElement | null {
  if (!node || typeof node !== "object") return null;

  const candidate =
    "getScrollableNode" in node &&
    typeof (node as { getScrollableNode?: unknown }).getScrollableNode === "function"
      ? (node as { getScrollableNode: () => unknown }).getScrollableNode()
      : node;

  return candidate && typeof candidate === "object" && "addEventListener" in candidate
    ? (candidate as HTMLElement)
    : null;
}

export function useHoverScrollbar({
  scrollRef,
  hoverRef,
  orientation,
  enabled = true,
}: {
  scrollRef: RefObject<unknown>;
  hoverRef: RefObject<unknown>;
  orientation: ScrollbarOrientation;
  enabled?: boolean;
}) {
  const thumbRef = useRef<TamaguiElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [geometry, setGeometry] = useState<ThumbGeometry>({
    offset: 0,
    size: 0,
    visible: false,
  });

  const readMetrics = useCallback(() => {
    const node = asDomElement(scrollRef.current);
    if (!node) return null;

    return orientation === "vertical"
      ? {
          viewport: node.clientHeight,
          content: node.scrollHeight,
          scrollOffset: node.scrollTop,
        }
      : {
          viewport: node.clientWidth,
          content: node.scrollWidth,
          scrollOffset: node.scrollLeft,
        };
  }, [orientation, scrollRef]);

  const update = useCallback(() => {
    const metrics = readMetrics();
    if (metrics) setGeometry(computeThumbGeometry(metrics));
  }, [readMetrics]);

  useEffect(() => {
    if (!isWeb || !enabled) return;

    const hover = asDomElement(hoverRef.current);
    const scroll = asDomElement(scrollRef.current);
    if (!hover || !scroll) return;

    const show = (): void => setHovered(true);
    const hide = (): void => {
      if (!dragRef.current) setHovered(false);
    };

    hover.addEventListener("pointerenter", show);
    hover.addEventListener("pointerleave", hide);
    scroll.addEventListener("scroll", update, { passive: true });

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => update());
    if (observer) {
      observer.observe(scroll);
      if (scroll.firstElementChild) observer.observe(scroll.firstElementChild);
    }

    update();

    return () => {
      hover.removeEventListener("pointerenter", show);
      hover.removeEventListener("pointerleave", hide);
      scroll.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [enabled, hoverRef, scrollRef, update]);

  useEffect(() => {
    if (!isWeb || !enabled) return;

    const thumb = asDomElement(thumbRef.current);
    if (!thumb) return;

    const onPointerDown = (event: PointerEvent): void => {
      const scroll = asDomElement(scrollRef.current);
      if (!scroll) return;

      event.preventDefault();
      event.stopPropagation();
      thumb.setPointerCapture?.(event.pointerId);
      dragRef.current = {
        pointer: orientation === "vertical" ? event.clientY : event.clientX,
        scroll: orientation === "vertical" ? scroll.scrollTop : scroll.scrollLeft,
      };
      setDragging(true);
      setHovered(true);
    };

    const onPointerMove = (event: PointerEvent): void => {
      const drag = dragRef.current;
      const scroll = asDomElement(scrollRef.current);
      if (!drag || !scroll) return;

      const viewport = orientation === "vertical" ? scroll.clientHeight : scroll.clientWidth;
      const content = orientation === "vertical" ? scroll.scrollHeight : scroll.scrollWidth;
      const pointer = orientation === "vertical" ? event.clientY : event.clientX;
      const thumbGeometry = computeThumbGeometry({ viewport, content, scrollOffset: 0 });
      const maxScroll = content - viewport;
      const thumbTravel = viewport - thumbGeometry.size;

      if (maxScroll <= 0 || thumbTravel <= 0) return;

      const next = drag.scroll + ((pointer - drag.pointer) / thumbTravel) * maxScroll;
      if (orientation === "vertical") {
        scroll.scrollTop = next;
      } else {
        scroll.scrollLeft = next;
      }
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!dragRef.current) return;

      thumb.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
      setDragging(false);

      const hover = asDomElement(hoverRef.current);
      if (hover && !hover.matches(":hover")) setHovered(false);
    };

    thumb.addEventListener("pointerdown", onPointerDown);
    thumb.addEventListener("pointermove", onPointerMove);
    thumb.addEventListener("pointerup", onPointerUp);
    thumb.addEventListener("pointercancel", onPointerUp);

    return () => {
      thumb.removeEventListener("pointerdown", onPointerDown);
      thumb.removeEventListener("pointermove", onPointerMove);
      thumb.removeEventListener("pointerup", onPointerUp);
      thumb.removeEventListener("pointercancel", onPointerUp);
    };
  }, [enabled, hoverRef, orientation, scrollRef]);

  return {
    geometry,
    visible: isWeb && hovered && geometry.visible,
    dragging,
    thumbRef,
  };
}
