import type { NextConfig } from "next";

/**
 * `@chelone/react` and its workspace siblings are linked to their SOURCE
 * (`main: ./src/index.ts`), so Next compiles them. The package's own `@/`
 * imports resolve through the `paths` in `tsconfig.json`.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@chelone/core", "@chelone/demo-data", "@chelone/react"],
  redirects() {
    return Promise.resolve([
      { source: "/", destination: "/admin/posts", permanent: false },
      { source: "/admin", destination: "/admin/posts", permanent: false },
    ]);
  },
};

export default nextConfig;
