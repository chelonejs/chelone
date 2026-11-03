/**
 * `CreatedDataRouter` (reached through `reactRouterAdapter.RouterWrapper` with
 * no host router) must build its browser router after commit: react-router's
 * browser history writes `window.history.replaceState` on creation, and a host
 * router that watches that call (TanStack's does) would setState mid-render.
 * The wrapped `replaceState` records whether a render is in progress.
 */

import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import type { createBrowserRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactRouterAdapter } from "./react-router-adapter";

type Router = ReturnType<typeof createBrowserRouter>;

const created: Router[] = [];

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    createBrowserRouter: (...args: Parameters<typeof createBrowserRouter>) => {
      const router = actual.createBrowserRouter(...args);
      vi.spyOn(router, "dispose");
      created.push(router);
      return router;
    },
  };
});

type Dispatcher = { useState: { name: string } } | null;

/**
 * Whether a component is rendering right now. React keeps a dispatcher on its
 * shared internals; outside a render its hooks are `throwInvalidHookError`
 * (in commit phase too, which is why `H != null` alone is not enough).
 */
function isRendering(): boolean {
  const internals = (
    React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
        H: Dispatcher;
      };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const dispatcher = internals.H;
  return (
    dispatcher != null && dispatcher.useState.name !== "throwInvalidHookError"
  );
}

const { RouterWrapper } = reactRouterAdapter;

describe("CreatedDataRouter", () => {
  const originalReplaceState = window.history.replaceState;
  let replaceStateCalls: { duringRender: boolean }[];

  beforeEach(() => {
    created.length = 0;
    window.history.replaceState(null, "");
    replaceStateCalls = [];
    window.history.replaceState = function (
      ...args: Parameters<History["replaceState"]>
    ) {
      replaceStateCalls.push({ duringRender: isRendering() });
      return originalReplaceState.apply(this, args);
    };
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState = originalReplaceState;
  });

  it("creating the router writes no history entry during render", () => {
    render(
      <RouterWrapper>
        <p>admin content</p>
      </RouterWrapper>,
    );

    expect(screen.getByText("admin content")).toBeTruthy();
    expect(replaceStateCalls.length).toBeGreaterThan(0);
    expect(replaceStateCalls.filter((call) => call.duringRender)).toEqual([]);
  });

  it("a re-render keeps the same router and history", () => {
    const { rerender } = render(
      <RouterWrapper>
        <p>first</p>
      </RouterWrapper>,
    );
    const callsAfterMount = replaceStateCalls.length;

    rerender(
      <RouterWrapper>
        <p>second</p>
      </RouterWrapper>,
    );

    expect(screen.getByText("second")).toBeTruthy();
    expect(created).toHaveLength(1);
    expect(replaceStateCalls).toHaveLength(callsAfterMount);
  });

  it("unmounting disposes the router", () => {
    const { unmount } = render(
      <RouterWrapper>
        <p>admin content</p>
      </RouterWrapper>,
    );
    expect(created).toHaveLength(1);
    expect(created[0]?.dispose).not.toHaveBeenCalled();

    unmount();

    expect(created[0]?.dispose).toHaveBeenCalledTimes(1);
  });
});
