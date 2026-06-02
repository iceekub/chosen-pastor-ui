import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone/server.js) so the
  // production container ships only the traced node_modules, not the whole
  // tree. No effect on `next dev` or a Vercel deploy.
  output: "standalone",
  // Pin the file-tracing root to THIS project. Without it Next can walk up and
  // pick a higher root from the surrounding four-repo workspace, nesting the
  // output at .next/standalone/<...path...>/server.js — which breaks the
  // container's `node server.js`. `next build` always runs with cwd = root.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      // Allow image uploads up to 10 MB through server actions
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
