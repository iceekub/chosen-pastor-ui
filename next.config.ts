import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow image uploads up to 10 MB through server actions
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
