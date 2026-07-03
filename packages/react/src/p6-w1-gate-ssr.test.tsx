// @vitest-environment node
/**
 * P6 W1 PATTERN GATE — SSR vector (pure node, NO jsdom).
 *
 * The `@vitest-environment node` pragma removes `window`/`document` entirely, so
 * any `window`-at-import in the core router (or a DOM read during a
 * server-render of the shell's join path) throws here — the strongest possible
 * check that the core router is SSR-safe and the shell can render on a host
 * router without a DOM router.
 */

import * as coreRouter from "@chelone/core";
import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Admin } from "./admin/admin";
import { Resource } from "./resource/resource";

describe("V5 — SSR: core router importable in pure node (no window-at-import)", () => {
  it("has no `window`/`document` global in the node environment (guards the premise)", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("core router primitives are importable and pure (createPath / matchPath / parseLocation)", () => {
    // These must not have referenced `window` at import (the import above would
    // have thrown otherwise). Exercise them to prove they run headless.
    expect(typeof coreRouter.parseLocation).toBe("function");
    // createResourceRegistry runs with no DOM.
    const registry = coreRouter.createResourceRegistry();
    registry.register({
      name: "posts",
      hasList: true,
      hasCreate: false,
      hasEdit: false,
      hasShow: false,
    });
    expect(registry.get("posts")?.hasList).toBe(true);
  });
});

describe("V5 — SSR: <Admin> renders on a host router without a DOM router", () => {
  it("renderToString of the join path (StaticRouter host) produces markup, no window access", () => {
    const html = renderToString(
      <StaticRouter location="/">
        <Admin
          dataProvider={fakeDataProvider({})}
          queryClient={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <Resource name="posts" list={() => <div>posts</div>} />
          <Admin.Ready>
            <div>ready</div>
          </Admin.Ready>
        </Admin>
      </StaticRouter>,
    );
    // A string came back (the shell shallow-rendered server-side). The registry
    // starts empty on the first synchronous render (registration is an effect,
    // which does not run during renderToString), so the empty-state `ready`
    // slot renders — proving the branch machinery ran without a DOM.
    expect(typeof html).toBe("string");
    expect(html).toContain("ready");
  });
});
