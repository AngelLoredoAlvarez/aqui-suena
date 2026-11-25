import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const mobileRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@aqui-suena/mobile": mobileRoot },
  },
  test: {
    environment: "node",
    include: ["components/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
  },
});
