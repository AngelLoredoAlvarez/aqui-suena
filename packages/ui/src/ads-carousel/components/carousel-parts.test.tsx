// @vitest-environment jsdom

import {
  ContactActions,
  ContactRow,
  FlyerNavButton,
  FlyerTransition,
} from "@aqui-suena/ui/ads-carousel/components/carousel-parts";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("ContactRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the label and value", () => {
    renderWithProviders(<ContactRow label="Phone" value="+54 9 11 5555-1234" />);

    expect(screen.getByText("Phone")).toBeTruthy();
    expect(screen.getByText("+54 9 11 5555-1234")).toBeTruthy();
  });
});

describe("ContactActions", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the call, whatsapp and directions actions in English", () => {
    renderWithProviders(<ContactActions />, { locale: "en" });

    expect(screen.getByText("Call")).toBeTruthy();
    expect(screen.getByText("WhatsApp")).toBeTruthy();
    expect(screen.getByText("Get directions")).toBeTruthy();
  });

  it("renders the actions localized in Spanish", () => {
    renderWithProviders(<ContactActions />, { locale: "es" });

    expect(screen.getByText("Llamar")).toBeTruthy();
    expect(screen.getByText("WhatsApp")).toBeTruthy();
    expect(screen.getByText("Cómo llegar")).toBeTruthy();
  });
});

describe("FlyerNavButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a previous button with the given label and fires onPress", () => {
    const onPress = vi.fn();
    renderWithProviders(
      <FlyerNavButton direction="previous" label="Previous ad" onPress={onPress} />,
    );

    const button = screen.getByRole("button", { name: "Previous ad" });
    expect(button.getAttribute("data-testid")).toBe("ads-carousel-previous");

    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders a next button with the given label", () => {
    renderWithProviders(<FlyerNavButton direction="next" label="Next ad" onPress={() => {}} />);

    expect(screen.getByRole("button", { name: "Next ad" }).getAttribute("data-testid")).toBe(
      "ads-carousel-next",
    );
  });
});

describe("FlyerTransition", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders its children inside the flyer layer", () => {
    renderWithProviders(
      <FlyerTransition>
        <span>flyer content</span>
      </FlyerTransition>,
    );

    expect(screen.getByTestId("ads-carousel-flyer-layer")).toBeTruthy();
    expect(screen.getByText("flyer content")).toBeTruthy();
  });
});
