// @vitest-environment jsdom

import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlayerDock } from "./player-dock";

describe("PlayerDock sheet placement", () => {
  afterEach(() => {
    cleanup();
  });

  it("anchors the sheet above the dock by default", () => {
    renderWithProviders(
      <PlayerDock isWide={false} sheet={<div>sheet</div>}>
        <div>card</div>
      </PlayerDock>,
    );

    expect(screen.getByTestId("player-dock-sheet").getAttribute("data-sheet-placement")).toBe(
      "above",
    );
  });

  it("anchors the sheet below the dock when the player is on top", () => {
    renderWithProviders(
      <PlayerDock isWide={false} position="top" sheet={<div>sheet</div>}>
        <div>card</div>
      </PlayerDock>,
    );

    expect(screen.getByTestId("player-dock-sheet").getAttribute("data-sheet-placement")).toBe(
      "below",
    );
  });
});
