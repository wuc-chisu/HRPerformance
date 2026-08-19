import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: 300 * 1024 * 1024,
  },
  turbopack: {
    root: dirname,
  },
};

export default nextConfig;
