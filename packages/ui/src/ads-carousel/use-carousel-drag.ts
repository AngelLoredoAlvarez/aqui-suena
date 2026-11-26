import { swipeDirection } from "@aqui-suena/ui/ads-carousel/swipe-navigation";
import { useRef, useState } from "react";

export type DragEvent = { nativeEvent: { clientX: number; clientY: number } };

export interface CarouselDragNavigation {
  previous: () => void;
  next: () => void;
}

/**
 * Turns pointer drag gestures into previous/next navigation. A swipe counts
 * only once it crosses the threshold and is mostly horizontal; the `swiped` ref
 * stays true for the whole gesture so the click that ends a drag never also
 * opens the flyer.
 */
export function useCarouselDrag(navigate: CarouselDragNavigation) {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const handlePointerDown = (event: DragEvent): void => {
    swiped.current = false;
    dragStart.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event: DragEvent): void => {
    const start = dragStart.current;

    if (start === null) return;

    const direction = swipeDirection(
      event.nativeEvent.clientX - start.x,
      event.nativeEvent.clientY - start.y,
    );

    if (direction === null) return;

    dragStart.current = null;
    swiped.current = true;

    if (direction === "next") {
      navigate.next();
    } else {
      navigate.previous();
    }
  };

  const stopDragging = (): void => {
    dragStart.current = null;
    setDragging(false);
  };

  const handlePointerUp = (event: DragEvent): void => {
    handlePointerMove(event);
    stopDragging();
  };

  return {
    dragging,
    swiped,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: stopDragging,
    handlePointerLeave: stopDragging,
  };
}
