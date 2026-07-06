import { index, type RouteConfig } from "@react-router/dev/routes";

// g1: the landing (/) is the only route. The docs layout + MDX page routes land
// in g2 (the `/docs/*` block is added then); the demo stays a standalone app
// (decision B) and is linked out, never mounted here.
export default [index("pages/home.tsx")] satisfies RouteConfig;
