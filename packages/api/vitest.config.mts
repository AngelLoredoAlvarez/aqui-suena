import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiSrc = path.join(fileURLToPath(import.meta.url), "..", "src");
const src = (relativePath: string) => path.join(apiSrc, relativePath);

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api/ads": src("domain/ads/ads-carousel.ts"),
      "@aqui-suena/api/client": src("client.ts"),
      "@aqui-suena/api/entitlements": src("domain/billing/catalog/entitlements.ts"),
      "@aqui-suena/api/listener": src("domain/radio/listener.ts"),
      "@aqui-suena/api/listing": src("domain/directory/listing.ts"),
      "@aqui-suena/api/router": src("server/trpc/router.ts"),
      "@aqui-suena/api/supabase": src("supabase.ts"),
      "@aqui-suena/api/trpc": src("server/trpc/trpc.ts"),
      "@aqui-suena/api": apiSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
