// @vitest-environment jsdom

import { Image } from "@aqui-suena/ui/optimized-image/image.native";
import { UiProvider } from "@aqui-suena/ui/shared";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
}));

vi.mock("expo-image", async () => {
  const { forwardRef } = await import("react");

  return {
    Image: forwardRef(function ExpoImageMock(props: Record<string, unknown>, _ref) {
      captured.props = props;

      return null;
    }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}

const SIGNED =
  "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg?X-Amz-Date=20261124T110000Z&X-Amz-Signature=aaa";

const CACHE_KEY =
  "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg";

describe("OptimizedImage native adapter", () => {
  beforeEach(() => {
    captured.props = null;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("passes the stable cache key inside the expo-image source", () => {
    render(<Image src={SIGNED} cacheKey={CACHE_KEY} width={100} height={100} />, { wrapper });

    expect(captured.props?.source).toEqual({ uri: SIGNED, cacheKey: CACHE_KEY });
  });

  it("enables the memory-disk cache by default", () => {
    render(<Image src={SIGNED} width={100} height={100} />, { wrapper });

    expect(captured.props?.cachePolicy).toBe("memory-disk");
  });

  it("routes the load callback through onLoadEnd to avoid the deprecated nativeEvent payload", () => {
    const onLoad = vi.fn();

    render(<Image src={SIGNED} onLoad={onLoad} width={100} height={100} />, { wrapper });

    expect(captured.props?.onLoad).toBeUndefined();
    expect(captured.props?.onLoadEnd).toBe(onLoad);
  });

  it("does not forward the Tamagui transition preset to expo-image", () => {
    render(<Image src={SIGNED} transition="quick" width={100} height={100} />, { wrapper });

    expect(captured.props?.transition).toBeUndefined();
  });

  it.each(["cover", "contain", "fill", "none", "scale-down"] as const)(
    "maps objectFit %s to the matching contentFit",
    (objectFit) => {
      render(<Image src={SIGNED} objectFit={objectFit} width={100} height={100} />, {
        wrapper,
      });

      expect(captured.props?.contentFit).toBe(objectFit);
    },
  );

  it.each([
    ["center top", "top center"],
    ["center bottom", "bottom center"],
    ["top", "top"],
    ["bottom", "bottom"],
    ["center", "center"],
  ] as const)("maps objectPosition %s to contentPosition %s", (objectPosition, expected) => {
    render(<Image src={SIGNED} objectPosition={objectPosition} width={100} height={100} />, {
      wrapper,
    });

    expect(captured.props?.contentPosition).toBe(expected);
  });
});
