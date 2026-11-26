// @vitest-environment jsdom

import {
  type StatusDictionary,
  StatusRow,
  statusDotColor,
  statusLabel,
} from "@aqui-suena/ui/player-card/components/status-indicator";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const dictionary: StatusDictionary = {
  playing: "Playing",
  paused: "Paused",
  loading: "Loading",
  signalUnavailable: "Signal unavailable",
  tapToPlay: "Tap to listen",
  tapToEnableSound: "Tap to enable sound",
  listening: (count: number) => `${count} listening`,
};

describe("statusDotColor", () => {
  it("maps each status to its dot color", () => {
    expect(statusDotColor("idle")).toBeNull();
    expect(statusDotColor("playing")).toBe("ok");
    expect(statusDotColor("paused")).toBe("accent");
    expect(statusDotColor("loading")).toBe("borderColor");
    expect(statusDotColor("error")).toBe("error");
    expect(statusDotColor("blocked")).toBeNull();
  });
});

describe("statusLabel", () => {
  it("maps each status to its localized label", () => {
    expect(statusLabel("playing", dictionary)).toBe("Playing");
    expect(statusLabel("paused", dictionary)).toBe("Paused");
    expect(statusLabel("loading", dictionary)).toBe("Loading");
    expect(statusLabel("error", dictionary)).toBe("Signal unavailable");
    expect(statusLabel("idle", dictionary)).toBe("Tap to listen");
    expect(statusLabel("blocked", dictionary)).toBe("Tap to enable sound");
  });
});

describe("StatusRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("composes the listener count when playing", () => {
    renderWithProviders(<StatusRow status="playing" listeners={42} dictionary={dictionary} />);

    expect(screen.getByText("Playing · 42 listening")).toBeTruthy();
    expect(screen.getByTestId("status-dot")).toBeTruthy();
  });

  it("shows the label without the count when listeners are unavailable", () => {
    renderWithProviders(<StatusRow status="playing" listeners={null} dictionary={dictionary} />);

    expect(screen.getByText("Playing")).toBeTruthy();
    expect(screen.queryByText(/listening/)).toBeNull();
  });

  it("omits the dot for idle and blocked", () => {
    renderWithProviders(<StatusRow status="idle" listeners={null} dictionary={dictionary} />);
    expect(screen.queryByTestId("status-dot")).toBeNull();

    cleanup();
    renderWithProviders(<StatusRow status="blocked" listeners={null} dictionary={dictionary} />);
    expect(screen.queryByTestId("status-dot")).toBeNull();
  });
});
