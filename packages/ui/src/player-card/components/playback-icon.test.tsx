// @vitest-environment jsdom

import { PlaybackIcon } from "@aqui-suena/ui/player-card/components/playback-icon";
import { renderWithProviders } from "@aqui-suena/ui/test-utils";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("PlaybackIcon", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the play shape", () => {
    renderWithProviders(<PlaybackIcon icon="play" />);

    expect(screen.getByTestId("playback-icon")).toBeTruthy();
  });

  it("renders the pause shape with two bars", () => {
    renderWithProviders(<PlaybackIcon icon="pause" />);

    expect(screen.getByTestId("playback-icon").children).toHaveLength(2);
  });

  it("renders the loading spinner", () => {
    renderWithProviders(<PlaybackIcon icon="loading" />);

    expect(screen.getByTestId("playback-icon")).toBeTruthy();
  });
});
