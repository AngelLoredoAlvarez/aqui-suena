// @vitest-environment jsdom

import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PositionToggle } from "./position-toggle";

const LABEL = "Mover reproductor arriba o abajo";

describe("PositionToggle", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a button with the move-player label", () => {
    renderWithProviders(<PositionToggle label={LABEL} onToggle={() => {}} />);

    expect(screen.getByRole("button", { name: LABEL })).toBeTruthy();
  });

  it("calls onToggle once when clicked", () => {
    const onToggle = vi.fn();
    renderWithProviders(<PositionToggle label={LABEL} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: LABEL }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
