/**
 * `CreatedDataRouter` (reached through `reactRouterAdapter.RouterWrapper` with
 * no host router) must build its browser router after commit: react-router's
 * browser history writes `window.history.replaceState` on creation, and a host
 * router that watches that call (TanStack's does) would setState mid-render.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
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

const { RouterWrapper } = reactRouterAdapter;

describe("CreatedDataRouter", () => {
  const originalReplaceState = window.history.replaceState;
  let replaceStateCalls: number;
  let hostSetState: (() => void) | undefined;

  beforeEach(() => {
    created.length = 0;
    window.history.replaceState(null, "");
    replaceStateCalls = 0;
    hostSetState = undefined;
    window.history.replaceState = function (
      ...args: Parameters<History["replaceState"]>
    ) {
      replaceStateCalls++;
      hostSetState?.();
      return originalReplaceState.apply(this, args);
    };
  });

  /** Stands in for a host router (TanStack's) that watches `replaceState`. */
  function Host({ children }: { children: ReactNode }) {
    const [, setTick] = useState(0);
    hostSetState = () => setTick((n) => n + 1);
    return <>{children}</>;
  }

  afterEach(() => {
    cleanup();
    window.history.replaceState = originalReplaceState;
  });

  it("creating the router writes no history entry during render", () => {
    // React reports a setState on another component during render by logging
    // "Cannot update a component (`Host`) while rendering a different component".
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Host>
        <RouterWrapper>
          <p>admin content</p>
        </RouterWrapper>
      </Host>,
    );

    expect(screen.getByText("admin content")).toBeTruthy();
    expect(replaceStateCalls).toBeGreaterThan(0);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("a re-render keeps the same router and history", () => {
    const { rerender } = render(
      <RouterWrapper>
        <p>first</p>
      </RouterWrapper>,
    );
    const callsAfterMount = replaceStateCalls;

    rerender(
      <RouterWrapper>
        <p>second</p>
      </RouterWrapper>,
    );

    expect(screen.getByText("second")).toBeTruthy();
    expect(created).toHaveLength(1);
    expect(replaceStateCalls).toBe(callsAfterMount);
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
