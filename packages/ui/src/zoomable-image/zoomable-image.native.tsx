import {
  clampOffset,
  clampScale,
  distance,
  pinchScale,
  type ZoomOffset,
  type ZoomViewport,
} from "@aqui-suena/ui/zoomable-image/zoom";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Animated, type GestureResponderEvent, PanResponder, View } from "react-native";

export type ZoomableImageProps = {
  readonly children: ReactNode;
};

type Gesture =
  | { readonly mode: "none" }
  | {
      readonly mode: "pan";
      readonly origin: ZoomOffset;
      readonly baseX: number;
      readonly baseY: number;
    }
  | { readonly mode: "pinch"; readonly startScale: number; readonly startDistance: number };

function touchDistance(event: GestureResponderEvent): number {
  const [first, second] = event.nativeEvent.touches;

  if (first === undefined || second === undefined) {
    return 0;
  }

  return distance(first.pageX, first.pageY, second.pageX, second.pageY);
}

export function ZoomableImage({ children }: ZoomableImageProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const current = useRef({ scale: 1, offset: { x: 0, y: 0 } as ZoomOffset });
  const viewport = useRef<ZoomViewport>({ width: 0, height: 0 });
  const gesture = useRef<Gesture>({ mode: "none" });

  const apply = (nextScale: number, nextOffset: ZoomOffset): void => {
    const clampedScale = clampScale(nextScale);
    const clampedOffset = clampOffset(nextOffset, clampedScale, viewport.current);

    current.current = { scale: clampedScale, offset: clampedOffset };
    scale.setValue(clampedScale);
    translate.setValue(clampedOffset);
  };

  const settle = (): void => {
    const { scale: settledScale, offset } = current.current;
    const target =
      settledScale <= 1 ? { x: 0, y: 0 } : clampOffset(offset, settledScale, viewport.current);

    current.current = { scale: settledScale, offset: target };
    gesture.current = { mode: "none" };

    Animated.spring(translate, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const touches = event.nativeEvent.touches;

        gesture.current =
          touches.length >= 2
            ? {
                mode: "pinch",
                startScale: current.current.scale,
                startDistance: touchDistance(event),
              }
            : { mode: "pan", origin: current.current.offset, baseX: 0, baseY: 0 };
      },
      onPanResponderMove: (event, state) => {
        if (event.nativeEvent.touches.length >= 2) {
          if (gesture.current.mode !== "pinch") {
            gesture.current = {
              mode: "pinch",
              startScale: current.current.scale,
              startDistance: touchDistance(event),
            };
          }

          const active = gesture.current;

          if (active.mode === "pinch") {
            apply(
              pinchScale(active.startScale, active.startDistance, touchDistance(event)),
              current.current.offset,
            );
          }

          return;
        }

        if (current.current.scale <= 1) {
          return;
        }

        if (gesture.current.mode !== "pan") {
          gesture.current = {
            mode: "pan",
            origin: current.current.offset,
            baseX: state.dx,
            baseY: state.dy,
          };
        }

        const active = gesture.current;

        if (active.mode === "pan") {
          apply(current.current.scale, {
            x: active.origin.x + state.dx - active.baseX,
            y: active.origin.y + state.dy - active.baseY,
          });
        }
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    }),
  ).current;

  return (
    <View
      style={{ flex: 1, width: "100%" }}
      onLayout={(event) => {
        viewport.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
      {...responder.panHandlers}
    >
      <Animated.View
        testID="zoomable-image-content"
        style={{
          flex: 1,
          alignSelf: "stretch",
          transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
