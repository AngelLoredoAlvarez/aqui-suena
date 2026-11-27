// @vitest-environment jsdom

import { Icon } from "@aqui-suena/ui/shared/icon";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("Icon", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an svg marked decorative", () => {
    const { container } = renderWithProviders(<Icon name="search" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the requested size", () => {
    const { container } = renderWithProviders(<Icon name="menu" size={22} />);

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("22");
    expect(svg?.getAttribute("height")).toBe("22");
  });
});
