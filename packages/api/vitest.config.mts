import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const apiSrc = path.join(fileURLToPath(import.meta.url), "..", "src");
const src = (relativePath: string) => path.join(apiSrc, relativePath);

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api/ads": src("domain/ads.ts"),
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
