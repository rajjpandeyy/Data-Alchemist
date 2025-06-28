import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* your existing config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
