import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configSrc = fileURLToPath(new URL("../config/src", import.meta.url));
const apiSrc = fileURLToPath(new URL("../api/src", import.meta.url));
const apiClient = fileURLToPath(new URL("../api/src/client.ts", import.meta.url));
const playerSrc = fileURLToPath(new URL("../player/src", import.meta.url));
const solitoLinkStub = fileURLToPath(
  new URL("./src/test-doubles/solito-link.tsx", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api/client": apiClient,
      "@aqui-suena/api": apiSrc,
      "@aqui-suena/config": configSrc,
      "@aqui-suena/player": playerSrc,
      "solito/link": solitoLinkStub,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
