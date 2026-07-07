import { index, type RouteConfig, route } from "@react-router/dev/routes";

// The landing (/) plus the docs engine. docs-layout renders the sidebar shell
// at /docs; index = overview, `components` = the component directory splash, and
// `*` = a filesystem-derived MDX page (or a section/group landing). The demo
// stays a standalone app (decision B) linked out, never mounted here.
export default [
  index("pages/home.tsx"),
  route("docs", "docs/docs-layout.tsx", [
    index("docs/docs-index.tsx"),
    route("components", "docs/docs-components.tsx"),
    route("*", "docs/mdx-page.tsx"),
  ]),
] satisfies RouteConfig;
