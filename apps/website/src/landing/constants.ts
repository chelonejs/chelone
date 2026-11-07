/** Shared brand motion ease — matches docs-index.tsx. */
export const ease = "cubic-bezier(0.32,0.72,0,1)";

/**
 * Inner card surface that sits inside a `BezelPanel` (and is reused by the
 * mockups' window chrome): subtle border + card background + the shared
 * 0.85rem corner radius. Compose with `cn(insetCard, …)` for extra layout.
 */
export const insetCard = "rounded-[0.85rem] border border-border/40 bg-card";

/** Canonical external/internal links used across the landing. */
export const links = {
  install: "/docs/getting-started/install",
  // The React adapter's install steps moved to the React section's setup page.
  reactSetup: "/docs/react/setup",
  // Decision B: the demo ships as a standalone Vite app, linked out (not folded
  // into this SSG shell). The website build copies apps/demo/dist → the static
  // output at build/client/demo/, so the deployed site serves the working admin
  // at /demo/. Consume this with a plain <a href> (hard nav) — NOT a react-router
  // <Link> — so the SPA router doesn't intercept it (there is no /demo/* route).
  demo: "/demo/",
  docs: "/docs",
  dataProviders: "/docs/app-config/data-providers",
  github: "https://github.com/chelonejs/chelone",
} as const;
