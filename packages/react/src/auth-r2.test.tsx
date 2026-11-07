/**
 * R2 — PERMISSIONS / ACCESS-CONTROL parity (React adapter). Covers the pieces
 * added on top of the existing identity/canAccess model:
 *
 *  - `usePermissions` — wraps `permissionsQueryOptions`; resolves the provider's
 *    permissions, undefined-tolerant (no `getPermissions` → undefined, not
 *    pending; no `authProvider` → undefined, not pending).
 *  - `<CanAccess>` — declarative gate: renders `children` only when access is
 *    granted, `loading` while pending, `accessDenied` when denied. ALLOW when
 *    access control is not configured (no authProvider / no canAccess).
 *  - `useLogoutIfAccessDenied` — given a data error, runs `authProvider
 *    .checkError`; on REJECT it logs out + notifies (never on an ordinary error).
 *  - the DATA-ERROR WIRING (`useWatchDataErrors`) — a 401/403 surfaced by the
 *    dataProvider auto-logs-out; an ordinary data error does NOT.
 */

import {
  type AuthProvider,
  createNotificationStore,
  defineResources,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  useLogoutIfAccessDenied,
  usePermissions,
  useWatchDataErrors,
} from "./auth-hooks";
import { CanAccess } from "./components/admin/auth/can-access";
import { CheloneProvider } from "./context";
import { useGetOne } from "./hooks";

afterEach(cleanup);

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

interface WrapperExtras {
  authProvider?: AuthProvider;
  notifications?: NotificationStore;
  dataProvider?: ReturnType<typeof fakeDataProvider>;
}

function makeWrapper(extra: WrapperExtras = {}) {
  const notifications = extra.notifications ?? createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={
        extra.dataProvider ??
        fakeDataProvider<typeof resources>({
          posts: [{ id: 1, title: "Alpha" }],
        })
      }
      queryClient={queryClient}
      authProvider={extra.authProvider}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, notifications, queryClient };
}

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

/**
 * The shape the fake provider below throws: a plain object carrying an HTTP
 * status. A guard, so `checkError` reads the status without a cast.
 */
function isStatusError(
  error: unknown,
  status: number,
): error is { status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === status
  );
}

/* -------------------------------------------------------------------------- */
/* usePermissions                                                             */
/* -------------------------------------------------------------------------- */

describe("usePermissions", () => {
  it("resolves the provider permissions", async () => {
    const authProvider = baseAuth({
      getPermissions: async () => ["admin", "editor"],
    });
    const { wrapper } = makeWrapper({ authProvider });
    const { result } = renderHook(() => usePermissions(), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.permissions).toEqual(["admin", "editor"]),
    );
    expect(result.current.isPending).toBe(false);
  });

  it("is undefined-tolerant with no getPermissions (not pending)", () => {
    const authProvider = baseAuth(); // no getPermissions
    const { wrapper } = makeWrapper({ authProvider });
    const { result } = renderHook(() => usePermissions(), { wrapper });
    expect(result.current.permissions).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  it("is undefined-tolerant with no authProvider (not pending, no throw)", () => {
    const { wrapper } = makeWrapper(); // no authProvider
    const { result } = renderHook(() => usePermissions(), { wrapper });
    expect(result.current.permissions).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  it("usePermissions with no auth provider runs no query", async () => {
    const { wrapper, queryClient } = makeWrapper(); // no authProvider
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await Promise.resolve();
    expect(result.current.isPending).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ["auth", "getPermissions", undefined] })?.state
        .fetchStatus ?? "idle",
    ).toBe("idle");
  });
});

/* -------------------------------------------------------------------------- */
/* <CanAccess>                                                                */
/* -------------------------------------------------------------------------- */

describe("<CanAccess>", () => {
  it("renders children when access is granted", async () => {
    const authProvider = baseAuth({
      canAccess: async ({ action }) => action === "edit",
    });
    const { wrapper } = makeWrapper({ authProvider });
    render(
      <CanAccess action="edit" resource="posts" accessDenied={<span>no</span>}>
        <span>yes</span>
      </CanAccess>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeTruthy());
    expect(screen.queryByText("no")).toBeNull();
  });

  it("renders accessDenied when access is denied", async () => {
    const authProvider = baseAuth({
      canAccess: async ({ action }) => action === "edit",
    });
    const { wrapper } = makeWrapper({ authProvider });
    render(
      <CanAccess
        action="delete"
        resource="posts"
        accessDenied={<span>no</span>}
      >
        <span>yes</span>
      </CanAccess>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByText("no")).toBeTruthy());
    expect(screen.queryByText("yes")).toBeNull();
  });

  it("scopes the check to the record it is given", async () => {
    const post = { id: 7, author: "rin" };
    const ids: (string | number | undefined)[] = [];
    const authProvider = baseAuth({
      canAccess: async ({ record }) => {
        ids.push(record?.id);
        return record?.id === 7;
      },
    });
    const { wrapper } = makeWrapper({ authProvider });
    render(
      <CanAccess
        action="edit"
        resource="posts"
        record={post}
        accessDenied={<span>no</span>}
      >
        <span>yes</span>
      </CanAccess>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByText("yes")).toBeTruthy());
    expect(ids).toEqual([7]);
  });

  it("ALLOWS when access control is not configured (no canAccess)", () => {
    const authProvider = baseAuth(); // no canAccess
    const { wrapper } = makeWrapper({ authProvider });
    render(
      <CanAccess action="delete" resource="posts">
        <span>yes</span>
      </CanAccess>,
      { wrapper },
    );
    expect(screen.getByText("yes")).toBeTruthy();
  });

  it("ALLOWS when there is no authProvider at all", () => {
    const { wrapper } = makeWrapper(); // no authProvider
    render(
      <CanAccess action="delete" resource="posts">
        <span>yes</span>
      </CanAccess>,
      { wrapper },
    );
    expect(screen.getByText("yes")).toBeTruthy();
  });
});

/* -------------------------------------------------------------------------- */
/* useLogoutIfAccessDenied                                                    */
/* -------------------------------------------------------------------------- */

describe("useLogoutIfAccessDenied", () => {
  it("logs out + notifies when checkError REJECTS", async () => {
    const logout = vi.fn(async () => {});
    const authProvider = baseAuth({
      logout,
      checkError: async () => {
        throw new Error("session invalid");
      },
    });
    const { wrapper, notifications } = makeWrapper({ authProvider });
    const { result } = renderHook(() => useLogoutIfAccessDenied(), { wrapper });

    let loggedOut = false;
    await waitFor(async () => {
      loggedOut = await result.current({ status: 403 });
      expect(loggedOut).toBe(true);
    });
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(notifications.getSnapshot().some((n) => n.type === "error")).toBe(
      true,
    );
  });

  it("does NOT log out when checkError RESOLVES (ordinary data error)", async () => {
    const logout = vi.fn(async () => {});
    const authProvider = baseAuth({
      logout,
      checkError: async () => {}, // resolves = ordinary error
    });
    const { wrapper, notifications } = makeWrapper({ authProvider });
    const { result } = renderHook(() => useLogoutIfAccessDenied(), { wrapper });

    const loggedOut = await result.current({ status: 500 });
    expect(loggedOut).toBe(false);
    expect(logout).not.toHaveBeenCalled();
    expect(notifications.getSnapshot()).toHaveLength(0);
  });

  it("no-ops (false) with no authProvider", async () => {
    const { wrapper } = makeWrapper(); // no authProvider
    const { result } = renderHook(() => useLogoutIfAccessDenied(), { wrapper });
    expect(await result.current({ status: 403 })).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* data-error wiring (useWatchDataErrors)                                     */
/* -------------------------------------------------------------------------- */

function Harness({ id }: { id: number }) {
  useWatchDataErrors();
  const { error } = useGetOne("posts", { id });
  return <span>{error ? "error" : "ok"}</span>;
}

describe("useWatchDataErrors (data-error → checkError → logout wiring)", () => {
  it("auto-logs-out on a 403 surfaced by the dataProvider", async () => {
    const logout = vi.fn(async () => {});
    const authProvider = baseAuth({
      logout,
      checkError: async (error) => {
        if (isStatusError(error, 403)) {
          throw new Error("denied");
        }
      },
    });
    const dataProvider = fakeDataProvider<typeof resources>({
      posts: [{ id: 1, title: "Alpha" }],
    });
    // getOne on a missing id → the fake rejects; force a 403 shape.
    dataProvider.getOne = async () => {
      throw { status: 403, message: "Forbidden" };
    };

    const { wrapper } = makeWrapper({ authProvider, dataProvider });
    render(<Harness id={999} />, { wrapper });

    await waitFor(() => expect(screen.getByText("error")).toBeTruthy());
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("does NOT log out on an ordinary (500) data error", async () => {
    const logout = vi.fn(async () => {});
    const authProvider = baseAuth({
      logout,
      checkError: async (error) => {
        if (isStatusError(error, 403)) {
          throw new Error("denied");
        }
      },
    });
    const dataProvider = fakeDataProvider<typeof resources>({
      posts: [{ id: 1, title: "Alpha" }],
    });
    dataProvider.getOne = async () => {
      throw { status: 500, message: "Server error" };
    };

    const { wrapper } = makeWrapper({ authProvider, dataProvider });
    render(<Harness id={999} />, { wrapper });

    await waitFor(() => expect(screen.getByText("error")).toBeTruthy());
    // give the subscription a tick to (not) fire
    await new Promise((r) => setTimeout(r, 20));
    expect(logout).not.toHaveBeenCalled();
  });
});
