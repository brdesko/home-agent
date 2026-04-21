import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling unpdf — it ships WASM/worker files that must
  // be loaded from node_modules at runtime, not inlined into the server bundle.
  serverExternalPackages: ['unpdf'],
};

export default nextConfig;
