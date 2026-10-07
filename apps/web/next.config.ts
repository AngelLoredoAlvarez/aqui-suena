import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@aqui/ui",
    "@aqui/config",
    "@aqui/navigation",
    "tamagui",
    "solito",
  ],
};

export default nextConfig;
