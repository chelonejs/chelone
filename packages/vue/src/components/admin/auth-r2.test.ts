/**
 * R2 (permissions / access-control) gate probes for the Vue adapter — the twin
 * of `@chelone/react`'s `auth-r2.test.tsx`:
 *
 * - `usePermissions` reads `authProvider.getPermissions` and is undefined-
 *   tolerant (no provider / no `getPermissions` → `undefined`, never pending).
 * - `<CanAccess>` renders its default slot on grant, the `#accessDenied` slot on
 *   deny, and ALLOWS when access control is unconfigured (no `canAccess`).
 * - `useLogoutIfAccessDenied` logs out on a checkError REJECTION (invalid
 *   session) and is a no-op on a checkError RESOLUTION (ordinary data error).
 * - the data-error wiring auto-logs-out on a data 403 (checkError rejects) but
 *   leaves an ordinary 500 alone (checkError resolves).
 * - a gated `<CreateButton>` + `<ResourceMenuItem>` hide when `canAccess`
 *   denies, show when it grants, and show when access control is unconfigured.
 *
 * All mounted under a real `<Admin>` + vue-router (the V3-c harness).
 */

import type { AuthProvider } from "@chelone/core";
import { type createNotificationStore, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../admin/admin.vue";
import {
  useLogoutIfAccessDenied,
  usePermissions,
} from "../../auth/permissions-hooks";
import CanAccess from "./auth/can-access.vue";
import CreateButton from "./buttons/create-button.vue";
import ResourceMenuItem from "./layout/resource-menu-item.vue";

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/login", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

interface MountOpts {
  authProvider?: AuthProvider;
  router?: Router;
  queryClient?: QueryClient;
  notifications?: ReturnType<typeof createNotificationStore>;
}

function mountAdmin(render: () => VNodeChild, opts: MountOpts = {}) {
  const router = opts.router ?? makeRouter();
  const dataProvider = fakeDataProvider({});
  const queryClient =
    opts.queryClient ??
    new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider,
            queryClient,
            authProvider: opts.authProvider,
            notifications: opts.notifications,
          },
          { default: render },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, router, queryClient };
}

/* -------------------------------------------------------------------------- */
/* usePermissions                                                             */
/* -------------------------------------------------------------------------- */

describe("usePermissions", () => {
  function probe(capture: { result?: ReturnType<typeof usePermissions> }) {
    return defineComponent({
      setup() {
        capture.result = usePermissions();
        return () => null;
      },
    });
  }

  it("resolves the provider's permissions", async () => {
    const capture: { result?: ReturnType<typeof usePermissions> } = {};
    mountAdmin(() => h(probe(capture)), {
      authProvider: makeAuthProvider({
        getPermissions: async () => ["admin", "editor"],
      }),
    });
    await vi.waitFor(() =>
      expect(capture.result?.permissions.value).toEqual(["admin", "editor"]),
    );
    expect(capture.result?.isPending.value).toBe(false);
  });

  it("is undefined-tolerant when the provider omits getPermissions", async () => {
    const capture: { result?: ReturnType<typeof usePermissions> } = {};
    mountAdmin(() => h(probe(capture)), { authProvider: makeAuthProvider() });
    await flushPromises();
    expect(capture.result?.permissions.value).toBeUndefined();
    expect(capture.result?.isPending.value).toBe(false);
  });

  it("is undefined-tolerant with no authProvider at all", async () => {
    const capture: { result?: ReturnType<typeof usePermissions> } = {};
    mountAdmin(() => h(probe(capture)));
    await flushPromises();
    expect(capture.result?.permissions.value).toBeUndefined();
    expect(capture.result?.isPending.value).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* <CanAccess>                                                                */
/* -------------------------------------------------------------------------- */

describe("<CanAccess>", () => {
  const grantedSlot = () => h("span", { "data-slot": "granted" }, "GRANTED");
  const deniedSlot = () => h("span", { "data-slot": "denied" }, "DENIED");

  it("renders the default slot when access is granted", async () => {
    const { wrapper } = mountAdmin(
      () =>
        h(
          CanAccess,
          { action: "edit", resource: "posts" },
          { default: grantedSlot, accessDenied: deniedSlot },
        ),
      { authProvider: makeAuthProvider({ canAccess: async () => true }) },
    );
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="granted"]').exists()).toBe(true),
    );
    expect(wrapper.find('[data-slot="denied"]').exists()).toBe(false);
  });

  it("renders the accessDenied slot when access is denied", async () => {
    const { wrapper } = mountAdmin(
      () =>
        h(
          CanAccess,
          { action: "edit", resource: "posts" },
          { default: grantedSlot, accessDenied: deniedSlot },
        ),
      { authProvider: makeAuthProvider({ canAccess: async () => false }) },
    );
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="denied"]').exists()).toBe(true),
    );
    expect(wrapper.find('[data-slot="granted"]').exists()).toBe(false);
  });

  it("scopes the check to the record it is given", async () => {
    const post = { id: 7, author: "rin" };
    const ids: (string | number | undefined)[] = [];
    const { wrapper } = mountAdmin(
      () =>
        h(
          CanAccess,
          {
            action: "edit",
            resource: "posts",
            record: post,
          },
          { default: grantedSlot, accessDenied: deniedSlot },
        ),
      {
        authProvider: makeAuthProvider({
          canAccess: async ({ record }) => {
            ids.push(record?.id);
            return record?.id === 7;
          },
        }),
      },
    );
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="granted"]').exists()).toBe(true),
    );
    expect(ids).toEqual([7]);
  });

  it("allows when access control is unconfigured (no canAccess method)", async () => {
    const { wrapper } = mountAdmin(
      () =>
        h(
          CanAccess,
          { action: "edit", resource: "posts" },
          { default: grantedSlot, accessDenied: deniedSlot },
        ),
      { authProvider: makeAuthProvider() },
    );
    await flushPromises();
    expect(wrapper.find('[data-slot="granted"]').exists()).toBe(true);
  });

  it("allows when there is no authProvider at all", async () => {
    const { wrapper } = mountAdmin(() =>
      h(
        CanAccess,
        { action: "edit", resource: "posts" },
        { default: grantedSlot, accessDenied: deniedSlot },
      ),
    );
    await flushPromises();
    expect(wrapper.find('[data-slot="granted"]').exists()).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* useLogoutIfAccessDenied                                                    */
/* -------------------------------------------------------------------------- */

describe("useLogoutIfAccessDenied", () => {
  function probe(capture: {
    run?: ReturnType<typeof useLogoutIfAccessDenied>;
  }) {
    return defineComponent({
      setup() {
        capture.run = useLogoutIfAccessDenied();
        return () => null;
      },
    });
  }

  it("logs out when checkError REJECTS (invalid session)", async () => {
    const logout = vi.fn(async () => {});
    const capture: { run?: ReturnType<typeof useLogoutIfAccessDenied> } = {};
    mountAdmin(() => h(probe(capture)), {
      authProvider: makeAuthProvider({
        logout,
        checkError: async () => {
          throw new Error("401");
        },
      }),
    });
    const result = await capture.run?.(new Error("401"));
    expect(result).toBe(true);
    await vi.waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("is a no-op when checkError RESOLVES (ordinary data error)", async () => {
    const logout = vi.fn(async () => {});
    const capture: { run?: ReturnType<typeof useLogoutIfAccessDenied> } = {};
    mountAdmin(() => h(probe(capture)), {
      authProvider: makeAuthProvider({ logout, checkError: async () => {} }),
    });
    const result = await capture.run?.(new Error("500"));
    expect(result).toBe(false);
    await flushPromises();
    expect(logout).not.toHaveBeenCalled();
  });

  it("is a no-op with no authProvider", async () => {
    const capture: { run?: ReturnType<typeof useLogoutIfAccessDenied> } = {};
    mountAdmin(() => h(probe(capture)));
    const result = await capture.run?.(new Error("boom"));
    expect(result).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* data-error wiring (useWatchDataErrors, mounted by <AdminShell>)           */
/* -------------------------------------------------------------------------- */

describe("data-error → auto-logout wiring", () => {
  it("logs out on a data 403 (checkError rejects)", async () => {
    const logout = vi.fn(async () => {});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mountAdmin(() => null, {
      authProvider: makeAuthProvider({
        logout,
        checkError: async () => {
          throw new Error("403");
        },
      }),
      queryClient,
    });
    // Simulate a dataProvider query error on the shared client.
    await queryClient
      .fetchQuery({
        queryKey: ["posts", "getList"],
        queryFn: async () => {
          throw new Error("403");
        },
        retry: false,
      })
      .catch(() => {});
    await vi.waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("does NOT log out on an ordinary data 500 (checkError resolves)", async () => {
    const logout = vi.fn(async () => {});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mountAdmin(() => null, {
      authProvider: makeAuthProvider({ logout, checkError: async () => {} }),
      queryClient,
    });
    await queryClient
      .fetchQuery({
        queryKey: ["posts", "getList"],
        queryFn: async () => {
          throw new Error("500");
        },
        retry: false,
      })
      .catch(() => {});
    await flushPromises();
    expect(logout).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/* gated CRUD button                                                          */
/* -------------------------------------------------------------------------- */

describe("gated <CreateButton>", () => {
  it("hides when create access is denied", async () => {
    const { wrapper } = mountAdmin(
      () => h(CreateButton, { resource: "posts" }),
      { authProvider: makeAuthProvider({ canAccess: async () => false }) },
    );
    await flushPromises();
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="create-button"]').exists()).toBe(false),
    );
  });

  it("shows when create access is granted", async () => {
    const { wrapper } = mountAdmin(
      () => h(CreateButton, { resource: "posts" }),
      { authProvider: makeAuthProvider({ canAccess: async () => true }) },
    );
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="create-button"]').exists()).toBe(true),
    );
  });

  it("shows when access control is unconfigured (no canAccess)", async () => {
    const { wrapper } = mountAdmin(
      () => h(CreateButton, { resource: "posts" }),
      { authProvider: makeAuthProvider() }, // no canAccess = fail-open
    );
    await flushPromises();
    expect(wrapper.find('[data-slot="create-button"]').exists()).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* gated resource menu item                                                   */
/* -------------------------------------------------------------------------- */

describe("gated <ResourceMenuItem>", () => {
  it("hides when list access is denied", async () => {
    const { wrapper } = mountAdmin(
      () => h(ResourceMenuItem, { name: "posts" }),
      {
        authProvider: makeAuthProvider({ canAccess: async () => false }),
      },
    );
    await vi.waitFor(() =>
      expect(wrapper.find('a[href="/posts"]').exists()).toBe(false),
    );
  });

  it("shows when list access is granted", async () => {
    const { wrapper } = mountAdmin(
      () => h(ResourceMenuItem, { name: "posts" }),
      {
        authProvider: makeAuthProvider({ canAccess: async () => true }),
      },
    );
    await vi.waitFor(() =>
      expect(wrapper.find('a[href="/posts"]').exists()).toBe(true),
    );
  });

  it("shows when access control is unconfigured (no canAccess)", async () => {
    const { wrapper } = mountAdmin(
      () => h(ResourceMenuItem, { name: "posts" }),
      {
        authProvider: makeAuthProvider(), // no canAccess = fail-open
      },
    );
    await flushPromises();
    expect(wrapper.find('a[href="/posts"]').exists()).toBe(true);
  });
});
