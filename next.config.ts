import type { NextConfig } from "next";

const nextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib'],
    ignoreDuringBuilds: true
  }
}

export default nextConfig;
