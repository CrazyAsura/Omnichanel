import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@xyflow/react",
      "recharts",
      "motion",
      "@reduxjs/toolkit",
      "@tanstack/react-query",
    ],
  },
};

export default nextConfig;
