import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/youtube-free-anime-aggregator',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
