import {
  clampOffset,
  clampScale,
  toggleScale,
  type ZoomOffset,
  type ZoomViewport,
} from "@aqui-suena/ui/zoomable-image/zoom";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { YStack } from "tamagui";

const WHEEL_STEP = 0.002;
const KEY_STEP = 0.5;
const TAP_DELAY_MS = 220;
const DRAG_THRESHOLD = 6;

export type ZoomableImageProps = {
  readonly children: ReactNode;
  readonly onTap?: () => void;
};

export function ZoomableImage({ children, onTap }: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<ZoomOffset>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef<ZoomOffset>({ x: 0, y: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);
  const dragRef = useRef<{
    readonly startX: number;
    readonly startY: number;
    readonly origin: ZoomOffset;
  } | null>(null);

  const commit = useCallback((nextScale: number, nextOffset: ZoomOffset) => {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  }, []);

  const viewport = useCallback((): ZoomViewport => {
    const rect = containerRef.current?.getBoundingClientRect();

    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }, []);

  const zoomTo = useCallback(
    (value: number) => {
      const nextScale = clampScale(value);

      commit(nextScale, clampOffset(offsetRef.current, nextScale, viewport()));
    },
    [commit, viewport],
  );

  const reset = useCallback(() => commit(1, { x: 0, y: 0 }), [commit]);

  useEffect(() => {
    const node = containerRef.current;

    if (node === null) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      zoomTo(scaleRef.current - event.deltaY * WHEEL_STEP);
    };

    const onDoubleClick = () => {
      if (tapTimer.current !== null) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }

      zoomTo(toggleScale(scaleRef.current));
    };

    const onClick = () => {
      if (moved.current || onTap === undefined) {
        return;
      }

      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        onTap();
      }, TAP_DELAY_MS);
    };

    const onPointerDown = (event: PointerEvent) => {
      moved.current = false;

      if (scaleRef.current <= 1) {
        return;
      }

      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        origin: offsetRef.current,
      };
      setPanning(true);
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;

      if (drag === null) {
        return;
      }

      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD) {
        moved.current = true;
      }

      commit(
        scaleRef.current,
        clampOffset(
          {
            x: drag.origin.x + event.clientX - drag.startX,
            y: drag.origin.y + event.clientY - drag.startY,
          },
          scaleRef.current,
          viewport(),
        ),
      );
    };

    const onPointerUp = () => {
      dragRef.current = null;
      setPanning(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "+":
        case "=":
          zoomTo(scaleRef.current + KEY_STEP);
          break;
        case "-":
        case "_":
          zoomTo(scaleRef.current - KEY_STEP);
          break;
        case "0":
          reset();
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("dblclick", onDoubleClick);
    node.addEventListener("click", onClick);
    node.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("dblclick", onDoubleClick);
      node.removeEventListener("click", onClick);
      node.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);

      if (tapTimer.current !== null) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
    };
  }, [commit, onTap, reset, viewport, zoomTo]);

  return (
    <YStack
      ref={(node) => {
        containerRef.current = node as HTMLDivElement | null;
      }}
      testID="zoomable-image"
      flex={1}
      width="100%"
      height="100%"
      items="center"
      justify="center"
      overflow="hidden"
      cursor={scale > 1 ? "grab" : "zoom-in"}
      style={{ touchAction: "none" }}
    >
      <YStack
        testID="zoomable-image-content"
        data-scale={scale}
        data-offset={`${Math.round(offset.x)},${Math.round(offset.y)}`}
        width="100%"
        height="100%"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: panning ? "none" : "transform 140ms ease-out",
          willChange: "transform",
        }}
      >
        {children}
      </YStack>
    </YStack>
  );
}
