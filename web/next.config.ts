import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // CV uploads go through a Server Action (default limit is 1 MB).
    serverActions: { bodySizeLimit: "10mb" },
  },
  partialPrefetching: true,
  turbopack: {
    // The repo root still holds v1's package-lock.json; pin the app root explicitly.
    root: path.resolve(process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
