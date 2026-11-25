// @vitest-environment jsdom

import { FlyerLightbox } from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox.native";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  modalProps: null as {
    visible: boolean;
    onRequestClose?: () => void;
  } | null,
}));

vi.mock("react-native", async () => {
  const React = await import("react");

  class FakeValue {
    setValue(): void {}
  }

  class FakeValueXY {
    readonly x = new FakeValue();
    readonly y = new FakeValue();

    setValue(): void {}
  }

  const View = React.forwardRef(function View(props: { children?: ReactNode }, _ref) {
    return React.createElement("div", null, props.children);
  });

  const Modal = (props: {
    children?: ReactNode;
    visible: boolean;
    onRequestClose?: () => void;
  }) => {
    native.modalProps = props;

    return props.visible ? React.createElement("div", null, props.children) : null;
  };

  return {
    Animated: {
      Value: FakeValue,
      ValueXY: FakeValueXY,
      View,
      spring: () => ({ start: () => {} }),
    },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Modal,
    View,
  };
});

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const ITEM = {
  id: "a",
  imageUrl: "https://example.com/a.png",
  alt: "Ad A",
};

describe("FlyerLightbox (native)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    native.modalProps = null;
  });

  it("keeps the modal hidden without an item", () => {
    renderWithProviders(<FlyerLightbox item={null} onClose={() => {}} />, { locale: "es" });

    expect(native.modalProps?.visible).toBe(false);
    expect(screen.queryByTestId("flyer-lightbox")).toBeNull();
  });

  it("shows the flyer and closes from the modal request", () => {
    const onClose = vi.fn();
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={onClose} />, { locale: "es" });

    expect(native.modalProps?.visible).toBe(true);
    expect(screen.getByAltText("Ad A")).toBeTruthy();
    expect(screen.getByLabelText("Cerrar flyer")).toBeTruthy();

    act(() => {
      native.modalProps?.onRequestClose?.();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with the close button", () => {
    const onClose = vi.fn();
    renderWithProviders(<FlyerLightbox item={ITEM} onClose={onClose} />, { locale: "es" });

    fireEvent.click(screen.getByTestId("flyer-lightbox-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
