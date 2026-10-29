import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiSrc = fileURLToPath(new URL("./src", import.meta.url));
const src = (relativePath: string) =>
  fileURLToPath(new URL(`./src/${relativePath}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api/ads": src("ads.ts"),
      "@aqui-suena/api/client": src("client.ts"),
      "@aqui-suena/api/entitlements": src("domain/entitlements.ts"),
      "@aqui-suena/api/listener": src("domain/listener.ts"),
      "@aqui-suena/api/listing": src("domain/listing.ts"),
      "@aqui-suena/api/router": src("server/router.ts"),
      "@aqui-suena/api/supabase": src("supabase.ts"),
      "@aqui-suena/api/trpc": src("server/trpc.ts"),
      "@aqui-suena/api": apiSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
