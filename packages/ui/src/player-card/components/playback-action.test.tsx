// @vitest-environment jsdom

import { PlaybackAction } from "@aqui-suena/ui/player-card/components/playback-action";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("PlaybackAction", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a play button for a non-error status", () => {
    renderWithProviders(<PlaybackAction status="paused" onResume={() => {}} onPause={() => {}} />, {
      locale: "en",
    });

    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  });

  it("renders nothing on error", () => {
    renderWithProviders(<PlaybackAction status="error" onResume={() => {}} onPause={() => {}} />, {
      locale: "en",
    });

    expect(screen.queryByRole("button")).toBeNull();
  });
});
