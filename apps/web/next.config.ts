import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aqui/ui", "@aqui/config", "@aqui/navigation"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
  },
};

export default nextConfig;
