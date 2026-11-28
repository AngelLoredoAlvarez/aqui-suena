import type { ThumbGeometry } from "@aqui-suena/ui/shared/scrollbar/compute-thumb";
import type { ScrollbarOrientation } from "@aqui-suena/ui/shared/scrollbar/use-hover-scrollbar";
import type { RefObject } from "react";
import { isWeb, type TamaguiElement, YStack } from "tamagui";

export function ScrollbarThumb({
  testID,
  orientation,
  geometry,
  visible,
  dragging,
  thumbRef,
}: {
  testID: string;
  orientation: ScrollbarOrientation;
  geometry: ThumbGeometry;
  visible: boolean;
  dragging: boolean;
  thumbRef: RefObject<TamaguiElement | null>;
}) {
  if (!isWeb) return null;

  const track =
    orientation === "vertical"
      ? { top: geometry.offset, right: 0 }
      : { bottom: 0, left: geometry.offset };
  const size =
    orientation === "vertical"
      ? { width: 8, height: geometry.size }
      : { height: 8, width: geometry.size };

  return (
    <YStack
      ref={thumbRef}
      testID={testID}
      data-visible={visible ? "true" : "false"}
      position="absolute"
      {...track}
      {...size}
      rounded={999}
      opacity={visible ? 1 : 0}
      pointerEvents={visible ? "auto" : "none"}
      cursor={dragging ? "grabbing" : "grab"}
      z={2}
      style={{ backgroundColor: "rgba(128, 138, 150, 0.55)" }}
    />
  );
}
