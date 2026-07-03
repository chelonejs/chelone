/**
 * W1-T6 tests (partition): `partitionChildren` walks a `<Admin>`'s children,
 * recurses `<Fragment>`s, ignores non-elements, and buckets by the static
 * `chelName` marker into resources / custom routes (with & without layout) /
 * page slots — the exact mechanism ra-core uses to hoist page slots out of the
 * children (parity §0a-9). A single async function-child drives a
 * loading → ready status machine (`useAdminChildren`).
 */

import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Resource } from "../resource/resource";
import {
  type AdminChildrenStatus,
  partitionChildren,
  useAdminChildren,
} from "./partition";
import {
  AdminAccessDenied,
  AdminAuthCallback,
  AdminAuthenticationError,
  AdminCatchAll,
  AdminDashboard,
  AdminError,
  AdminLayout,
  AdminLoading,
  AdminLoginPage,
  AdminReady,
  AdminTitle,
  CustomRoutes,
} from "./slots";

afterEach(() => {
  cleanup();
});

const List = () => <div>list</div>;

describe("partitionChildren — resource + custom-route bucketing", () => {
  it("buckets <Resource> children into `resources` (order preserved)", () => {
    const parts = partitionChildren(
      <>
        <Resource name="posts" list={List} />
        <Resource name="comments" list={List} />
      </>,
    );
    expect(parts.resources).toHaveLength(2);
    const names = parts.resources.map(
      (el) => (el.props as { name: string }).name,
    );
    expect(names).toEqual(["posts", "comments"]);
  });

  it("splits <CustomRoutes> by noLayout (with-layout vs without-layout)", () => {
    const parts = partitionChildren(
      <>
        <CustomRoutes>
          <div>with-layout</div>
        </CustomRoutes>
        <CustomRoutes noLayout>
          <div>no-layout</div>
        </CustomRoutes>
      </>,
    );
    expect(parts.customRoutesWithLayout).toHaveLength(1);
    expect(parts.customRoutesWithoutLayout).toHaveLength(1);
  });

  it("recurses <Fragment> children (nested resources are found)", () => {
    const parts = partitionChildren(
      <>
        {/* biome-ignore lint/complexity/noUselessFragments: nested fragments are the fixture — the test asserts Fragment recursion. */}
        <>
          <Resource name="a" list={List} />
          {/* biome-ignore lint/complexity/noUselessFragments: nested fragments are the fixture — the test asserts Fragment recursion. */}
          <>
            <Resource name="b" list={List} />
          </>
        </>
        <Resource name="c" list={List} />
      </>,
    );
    expect(
      parts.resources.map((el) => (el.props as { name: string }).name),
    ).toEqual(["a", "b", "c"]);
  });

  it("ignores non-element children (strings, numbers, null, booleans)", () => {
    const parts = partitionChildren(
      <>
        {"text"}
        {42}
        {null}
        {false}
        {undefined}
        <Resource name="posts" list={List} />
      </>,
    );
    expect(parts.resources).toHaveLength(1);
  });

  it("ignores unknown elements that carry no chelName marker", () => {
    const parts = partitionChildren(
      <>
        <div>plain</div>
        <span>markup</span>
        <Resource name="posts" list={List} />
      </>,
    );
    expect(parts.resources).toHaveLength(1);
    expect(parts.customRoutesWithLayout).toHaveLength(0);
  });
});

describe("partitionChildren — page slots", () => {
  it("buckets every page-slot marker into `slots`", () => {
    const parts = partitionChildren(
      <>
        <AdminTitle>My App</AdminTitle>
        <AdminLayout>
          <div>layout</div>
        </AdminLayout>
        <AdminLoginPage>
          <div>login</div>
        </AdminLoginPage>
        <AdminDashboard>
          <div>dash</div>
        </AdminDashboard>
        <AdminCatchAll>
          <div>404</div>
        </AdminCatchAll>
        <AdminError>
          <div>err</div>
        </AdminError>
        <AdminReady>
          <div>ready</div>
        </AdminReady>
        <AdminAuthCallback>
          <div>cb</div>
        </AdminAuthCallback>
        <AdminLoading>
          <div>loading</div>
        </AdminLoading>
        <AdminAccessDenied>
          <div>denied</div>
        </AdminAccessDenied>
        <AdminAuthenticationError>
          <div>autherr</div>
        </AdminAuthenticationError>
        <Resource name="posts" list={List} />
      </>,
    );
    expect(parts.slots.title).toBeDefined();
    expect(parts.slots.layout).toBeDefined();
    expect(parts.slots.loginPage).toBeDefined();
    expect(parts.slots.dashboard).toBeDefined();
    expect(parts.slots.catchAll).toBeDefined();
    expect(parts.slots.error).toBeDefined();
    expect(parts.slots.ready).toBeDefined();
    expect(parts.slots.authCallback).toBeDefined();
    expect(parts.slots.loading).toBeDefined();
    expect(parts.slots.accessDenied).toBeDefined();
    expect(parts.slots.authenticationError).toBeDefined();
    // The resource still lands in its own bucket, not the slots.
    expect(parts.resources).toHaveLength(1);
  });

  it("leaves absent slots undefined", () => {
    const parts = partitionChildren(<Resource name="posts" list={List} />);
    expect(parts.slots.dashboard).toBeUndefined();
    expect(parts.slots.layout).toBeUndefined();
    expect(parts.slots.title).toBeUndefined();
  });

  it("carries the slot child's content through (rendered later by the shell)", () => {
    const parts = partitionChildren(
      <AdminDashboard>
        <div data-testid="dash">the dashboard</div>
      </AdminDashboard>,
    );
    render(parts.slots.dashboard);
    expect(screen.getByTestId("dash")).toBeDefined();
  });

  it("keeps the LAST of duplicate slot markers (last write wins)", () => {
    const parts = partitionChildren(
      <>
        <AdminTitle>first</AdminTitle>
        <AdminTitle>second</AdminTitle>
      </>,
    );
    render(parts.slots.title);
    expect(screen.getByText("second")).toBeDefined();
  });
});

describe("useAdminChildren — async function-child status machine", () => {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter>{children}</MemoryRouter>;
  }

  it("returns status='ready' immediately for static (non-function) children", () => {
    const { result } = renderHook(
      () => useAdminChildren(<Resource name="posts" list={List} />, undefined),
      { wrapper: Wrapper },
    );
    expect(result.current.status).toBe<AdminChildrenStatus>("ready");
    expect(result.current.parts.resources).toHaveLength(1);
  });

  it("resolves an async function-child: loading → ready", async () => {
    let resolveChildren!: (nodes: ReactNode) => void;
    const childrenPromise = new Promise<ReactNode>((res) => {
      resolveChildren = res;
    });
    const asyncChild = () => childrenPromise;

    const { result } = renderHook(
      () => useAdminChildren(asyncChild, undefined),
      { wrapper: Wrapper },
    );
    // Before the promise resolves: loading, no resources yet.
    expect(result.current.status).toBe<AdminChildrenStatus>("loading");
    expect(result.current.parts.resources).toHaveLength(0);

    await act(async () => {
      resolveChildren(<Resource name="posts" list={List} />);
      await childrenPromise;
    });

    expect(result.current.status).toBe<AdminChildrenStatus>("ready");
    expect(result.current.parts.resources).toHaveLength(1);
  });

  it("supports a SYNC function-child (returns elements directly): ready", () => {
    const syncChild = () => <Resource name="posts" list={List} />;
    const { result } = renderHook(
      () => useAdminChildren(syncChild, undefined),
      { wrapper: Wrapper },
    );
    expect(result.current.status).toBe<AdminChildrenStatus>("ready");
    expect(result.current.parts.resources).toHaveLength(1);
  });

  it("passes permissions to the function-child", () => {
    const fn = vi.fn(() => <Resource name="posts" list={List} />);
    renderHook(() => useAdminChildren(fn, { role: "admin" }), {
      wrapper: Wrapper,
    });
    expect(fn).toHaveBeenCalledWith({ role: "admin" });
  });

  it("does not double-register under StrictMode remount (function-child)", async () => {
    const fn = vi.fn(async () => <Resource name="posts" list={List} />);
    function StrictWrapper({ children }: { children: ReactNode }) {
      return (
        <StrictMode>
          <MemoryRouter>{children}</MemoryRouter>
        </StrictMode>
      );
    }
    const { result } = renderHook(() => useAdminChildren(fn, undefined), {
      wrapper: StrictWrapper,
    });
    await act(async () => {
      await Promise.resolve();
    });
    // Resolves without throwing; the resource is found once (no duplicate rows).
    expect(result.current.parts.resources).toHaveLength(1);
  });
});
