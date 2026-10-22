import type { NextConfig } from "next";

// Static consumers (the Tauri bundle and Cloudflare Pages) ship a static
// export, so they need `output: "export"`. A static export cannot host a
// dynamic route handler, which is why the /api/stream proxy lives in the API
// server (packages/api). The server build maps the old browser-visible URL onto
// it, so nothing in the browser changes.
const isStaticExport = process.env.STATIC_EXPORT === "1";
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aqui-suena/ui", "@aqui-suena/config"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
  },
  ...(isStaticExport
    ? { output: "export" as const }
    : {
        async rewrites() {
          return [{ source: "/api/stream", destination: `${apiOrigin}/stream` }];
        },
      }),
};

export default nextConfig;
