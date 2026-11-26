// @vitest-environment jsdom

import Index from "@aqui-suena/mobile/app/index";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  loadPosition: vi.fn(async (): Promise<"top" | "bottom" | undefined> => undefined),
  savePosition: vi.fn(async (): Promise<void> => {}),
}));

vi.mock("@aqui-suena/ui", () => ({
  PlayerLanding: ({
    initialPosition,
    onPositionChange,
  }: {
    initialPosition?: string;
    onPositionChange?: (next: string) => void;
  }) =>
    React.createElement("div", {
      "data-testid": "player-landing",
      "data-initial": String(initialPosition),
      onClick: () => onPositionChange?.("top"),
    }),
}));

vi.mock("@aqui-suena/ui/state", () => ({
  loadPersistedPlayerCardPositionAsync: ui.loadPosition,
  savePersistedPlayerCardPositionAsync: ui.savePosition,
}));

afterEach(cleanup);
afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
  ui.loadPosition.mockResolvedValue(undefined);
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

  it("restores the persisted player-card position", async () => {
    ui.loadPosition.mockResolvedValueOnce("top");

    render(<Index />);
    await act(async () => {});

    expect(screen.getByTestId("player-landing").dataset.initial).toBe("top");
  });

  it("keeps the default position when restoring storage fails", async () => {
    ui.loadPosition.mockRejectedValueOnce(new Error("denied"));

    render(<Index />);
    await act(async () => {});

    expect(screen.getByTestId("player-landing").dataset.initial).toBe("undefined");
  });

  it("persists a manual position change", () => {
    render(<Index />);

    fireEvent.click(screen.getByTestId("player-landing"));

    expect(ui.savePosition).toHaveBeenCalledWith(expect.anything(), "top");
  });
});
