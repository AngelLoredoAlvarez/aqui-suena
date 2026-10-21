"use client";

import { PlayerLanding } from "@aqui-suena/ui";
import { trayBridge } from "./tray-bridge";

export default function HomePage() {
  return <PlayerLanding trayBridge={trayBridge} />;
}
