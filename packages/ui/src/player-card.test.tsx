// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlayerCard } from "./player-card";
import { UiProvider } from "./provider";

function renderCard(props: { status: "playing" | "blocked" | "error"; onResume?: () => void }) {
  const wrapper = ({ children }: { children: ReactNode }) => <UiProvider>{children}</UiProvider>;
  return render(
    <PlayerCard
      stationName="Aqui Suena"
      listeners={42}
      stationId="station-1"
      onResume={props.onResume ?? (() => {})}
      status={props.status}
    />,
    { wrapper },
  );
}

describe("PlayerCard", () => {
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

    fireEvent.click(screen.getByText("Tap to enable sound"));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("shows the mirror message with no resume button on error", () => {
    renderCard({ status: "error" });

    expect(screen.getByText("Signal unavailable, trying mirror…")).toBeTruthy();
    expect(screen.queryByText("Tap to enable sound")).toBeNull();
  });

  it("links to the station deep-link route", () => {
    const { container } = renderCard({ status: "playing" });
    const link = container.querySelector('a[href="/player/station-1"]');

    expect(link).toBeTruthy();
  });
});
