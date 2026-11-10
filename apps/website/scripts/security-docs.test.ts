// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const security = read("../src/docs/content/app-config/security.mdx");
const admin = read("../src/docs/content/app-config/admin.mdx");

/** The `## Route guards` section, up to the next `##`. */
const routeGuards = security.split("## Route guards")[1].split("\n## ")[0];

/** The `### Next.js App Router` section, up to the next `###`. */
const nextSection = admin.split("### Next.js App Router")[1].split("\n### ")[0];

it("the Route guards section gains an On the server part after the Vue paragraph", () => {
  const vue = routeGuards.indexOf("beforeEach");
  const server = routeGuards.indexOf("### On the server");
  expect(vue).toBeGreaterThan(-1);
  expect(
    server,
    "### On the server in the Route guards section",
  ).toBeGreaterThan(vue);
});

it("the server part explains the cookie session and the per-request provider", () => {
  expect(routeGuards).toContain("cookie");
  expect(routeGuards).toContain("once per request");
  expect(routeGuards).toContain("httpOnly");
  expect(routeGuards).toContain("localStorage");
});

it("the server part says where context.authProvider and context.queryClient come from", () => {
  expect(routeGuards).toContain("context.authProvider");
  expect(routeGuards).toContain("context.queryClient");
  expect(routeGuards).toContain("router context");
  expect(routeGuards).toContain("getRouter");
  expect(routeGuards).toContain("apps/start-demo/src/router.tsx");
  expect(routeGuards).toContain("apps/start-demo/src/auth.ts");
});

it("the server part covers the Next proxy, why it is not a layout, and safeRedirectTarget", () => {
  expect(routeGuards).toContain("proxy");
  expect(routeGuards).toContain("apps/next-demo/src/proxy.ts");
  expect(routeGuards).toContain("checkRouteAuth");
  expect(routeGuards).toContain('matcher: "/admin/:path*"');
  expect(routeGuards).toContain("NextResponse.redirect");
  expect(routeGuards).toMatch(/layout does\s+not run again/);
  expect(routeGuards).toContain("safeRedirectTarget");
  expect(routeGuards).toContain("apps/next-demo/src/login-form.tsx");
});

it("every demo file the server part names exists", () => {
  for (const path of [
    "apps/start-demo/src/router.tsx",
    "apps/start-demo/src/auth.ts",
    "apps/start-demo/src/routes/__root.tsx",
    "apps/next-demo/src/proxy.ts",
    "apps/next-demo/src/auth.ts",
    "apps/next-demo/src/login-form.tsx",
    "apps/next-demo/src/app/login/page.tsx",
  ]) {
    expect(existsSync(new URL(`../../../${path}`, import.meta.url)), path).toBe(
      true,
    );
  }
});

it("the requireAuthBeforeLoad snippet and the Vue paragraph stay as they are", () => {
  expect(routeGuards).toContain("requireAuthBeforeLoad");
  expect(routeGuards).toContain("redirectAuthenticatedBeforeLoad");
  expect(routeGuards).toContain("checkRouteAuth(queryClient,");
  expect(routeGuards).toContain("beforeEach");
  expect(routeGuards).toContain("safeRedirectTarget(raw)");
});

it("the Admin page's Next section links the server guard part", () => {
  expect(nextSection).toContain("](/docs/app-config/security#on-the-server)");
});

it("every docs link on the security and admin pages resolves", () => {
  expect(unresolvedDocLinks(security)).toEqual([]);
  expect(unresolvedDocLinks(admin)).toEqual([]);
});
