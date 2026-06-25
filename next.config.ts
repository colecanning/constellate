import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a parent-level pnpm-lock.yaml otherwise confuses
  // Turbopack's root inference.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
