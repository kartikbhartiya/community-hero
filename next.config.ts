import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server build for small Docker images / Cloud Run.
  output: "standalone",
  // Pin the trace root to this project so standalone output is flat
  // (avoids nesting when a lockfile exists higher up the path).
  outputFileTracingRoot: process.cwd(),
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
  },
};

export default nextConfig;
