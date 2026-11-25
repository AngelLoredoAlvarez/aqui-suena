// @vitest-environment jsdom

import { UiProvider } from "@aqui-suena/ui/shared";
import { ZoomableImage } from "@aqui-suena/ui/zoomable-image/zoomable-image.native";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  config: null as Record<string, (...args: never[]) => void> | null,
  values: [] as { read: () => number }[],
  viewProps: null as {
    onLayout?: (event: unknown) => void;
    style?: { flex?: number; width?: string };
  } | null,
}));

vi.mock("react-native", async () => {
  const React = await import("react");

  class FakeValue {
    private value: number;

    constructor(value: number) {
      this.value = value;
      native.values.push({
        read: () => this.value,
      });
    }

    setValue(value: number): void {
      this.value = value;
    }
  }

  class FakeValueXY {
    readonly x = new FakeValue(0);
    readonly y = new FakeValue(0);

    setValue(value: { x: number; y: number }): void {
      this.x.setValue(value.x);
      this.y.setValue(value.y);
    }
  }

  const View = React.forwardRef(function View(
    props: {
      children?: ReactNode;
      onLayout?: (event: unknown) => void;
      style?: { flex?: number; width?: string };
    },
    _ref,
  ) {
    if (props.onLayout) {
      native.viewProps = props;
    }

    return React.createElement("div", null, props.children);
  });

  const Animated = {
    Value: FakeValue,
    ValueXY: FakeValueXY,
    View,
    spring: () => ({ start: () => {} }),
  };

  const PanResponder = {
    create: (config: Record<string, (...args: never[]) => void>) => {
      native.config = config;

      return { panHandlers: {} };
    },
  };

  return { Animated, PanResponder, View };
});

function wrapper({ children }: { children: ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}

function renderZoomable(): void {
  render(
    <ZoomableImage>
      <div>flyer</div>
    </ZoomableImage>,
    { wrapper },
  );
}

function touch(pageX: number, pageY: number) {
  return { pageX, pageY };
}

function gestureEvent(touches: { pageX: number; pageY: number }[]) {
  return { nativeEvent: { touches } };
}

describe("ZoomableImage (native)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    native.config = null;
    native.values = [];
  });

  it("renders its children and wires a pan responder", () => {
    renderZoomable();

    expect(screen.getByText("flyer")).toBeTruthy();
    expect(native.config).not.toBeNull();
    expect(native.viewProps?.style).toMatchObject({ flex: 1, width: "100%" });
  });

  it("scales from the distance between two touches", () => {
    renderZoomable();

    const config = native.config as Record<string, (...args: never[]) => void>;

    const grant = config.onPanResponderGrant as unknown as (event: unknown) => void;

    const move = config.onPanResponderMove as unknown as (
      event: unknown,
      state: { dx: number; dy: number },
    ) => void;

    const scale = native.values[0];

    grant(gestureEvent([touch(0, 0), touch(100, 0)]));
    move(gestureEvent([touch(0, 0), touch(200, 0)]), { dx: 0, dy: 0 });

    expect(scale?.read()).toBe(2);
  });

  it("pans with one touch while zoomed", () => {
    renderZoomable();

    const config = native.config as Record<string, (...args: never[]) => void>;

    const grant = config.onPanResponderGrant as unknown as (event: unknown) => void;

    const move = config.onPanResponderMove as unknown as (
      event: unknown,
      state: { dx: number; dy: number },
    ) => void;

    const [scale, translateX, translateY] = native.values;

    native.viewProps?.onLayout?.({
      nativeEvent: { layout: { width: 400, height: 800 } },
    });

    grant(gestureEvent([touch(0, 0), touch(100, 0)]));
    move(gestureEvent([touch(0, 0), touch(200, 0)]), { dx: 0, dy: 0 });
    grant(gestureEvent([touch(50, 50)]));
    move(gestureEvent([touch(50, 50)]), { dx: 30, dy: -20 });

    expect(scale?.read()).toBe(2);
    expect(translateX?.read()).toBe(30);
    expect(translateY?.read()).toBe(-20);
  });
});
