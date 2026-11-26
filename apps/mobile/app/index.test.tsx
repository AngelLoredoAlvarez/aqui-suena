// @vitest-environment jsdom

import Index from "@aqui-suena/mobile/app/index";
import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  loadPosition: vi.fn(async () => null),
  savePosition: vi.fn(async () => {}),
}));

vi.mock("@aqui-suena/ui", () => ({
  PlayerLanding: () => React.createElement("div", { "data-testid": "player-landing" }),
}));

vi.mock("@aqui-suena/ui/state", () => ({
  loadPersistedPlayerCardPositionAsync: ui.loadPosition,
  savePersistedPlayerCardPositionAsync: ui.savePosition,
}));

afterEach(cleanup);
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Index", () => {
  it("shows the boot splash until the two-second boot timer completes", async () => {
    render(<Index />);

    expect(screen.getByTestId("player-landing")).toBeTruthy();
    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByLabelText("Cargando Aquí Suena")).toBeNull();
  });
});
