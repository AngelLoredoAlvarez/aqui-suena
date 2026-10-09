import { appName } from "@aqui-suena/config";

export const placeholderMessage = "UI placeholder";

export function greeting(): string {
  return `Hello from ${appName} UI placeholder`;
}

export { AdsCarousel } from "./ads-carousel";
export { useListenerStatus } from "./listener-status";
export type { PlayerCardProps, PlayerCardStatus, StationRef } from "./player-card";
export { PlayerCard } from "./player-card";
export { PlayerLanding } from "./player-landing";
export { UiProvider } from "./provider";
export { SharedButton } from "./shared-button";
