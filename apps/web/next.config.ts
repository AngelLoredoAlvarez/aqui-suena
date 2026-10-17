import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aqui-suena/ui", "@aqui-suena/config"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
  },
};

export default nextConfig;
