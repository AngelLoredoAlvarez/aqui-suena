// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerCard } from "./player-card";
import { UiProvider } from "./provider";

function renderCard(props: {
  status: "playing" | "blocked" | "error";
  onResume?: () => void;
  onOpen?: () => void;
}) {
  const wrapper = ({ children }: { children: ReactNode }) => <UiProvider>{children}</UiProvider>;
  return render(
    <PlayerCard
      stationName="Aqui Suena"
      listeners={42}
      onResume={props.onResume ?? (() => {})}
      onOpen={props.onOpen}
      status={props.status}
    />,
    { wrapper },
  );
}

describe("PlayerCard", () => {
  afterEach(() => {
    cleanup();
  });
  it("shows the status and listeners with no resume button when playing", () => {
    renderCard({ status: "playing" });

    expect(screen.getByText("Playing")).toBeTruthy();
    expect(screen.getByText(/42 listening/)).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("shows exactly one resume tap and nothing else clickable when blocked", () => {
    renderCard({ status: "blocked" });

    expect(screen.getByText("Tap to enable sound")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("calls onResume once when the resume tap is pressed", () => {
    const onResume = vi.fn();
    renderCard({ status: "blocked", onResume });

    fireEvent.click(screen.getByRole("button"));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("shows the mirror message with no resume button on error", () => {
    renderCard({ status: "error" });

    expect(screen.getByText("Signal unavailable, trying mirror…")).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("calls onOpen when the Open affordance is pressed", () => {
    const onOpen = vi.fn();
    renderCard({ status: "playing", onOpen });

    fireEvent.click(screen.getByText("Open"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows no Open affordance without an onOpen handler", () => {
    renderCard({ status: "playing" });

    expect(screen.queryByText("Open")).toBeNull();
  });
});
