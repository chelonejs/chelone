/**
 * The lock composables, mounted through probe components under a real
 * `<Admin>` over a `realtimeDataProvider` whose `inMemoryLockProvider`
 * announces on a `memoryTransport`. Each case asserts what the probe renders
 * and what the lock provider holds.
 */

import {
  type AuthProvider,
  defineResources,
  fakeDataProvider,
  type Identifier,
  inMemoryLockProvider,
  type Lock,
  LockConflictError,
  type LockProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  type Component,
  defineComponent,
  h,
  nextTick,
  type Ref,
  ref,
} from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  provideRecordContext,
  type RecordValue,
} from "../record/record-context";
import { provideResourceContext } from "../resource-context";
import {
  useGetLock,
  useGetLockLive,
  useGetLocks,
  useGetLocksLive,
  useLock,
  useLockOnMount,
  useUnlock,
} from "./locks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function setup(wrap?: (locks: LockProvider) => LockProvider) {
  const transport = memoryTransport();
  const inMemory = inMemoryLockProvider({ publisher: transport });
  const locks = wrap ? wrap(inMemory) : inMemory;
  const dataProvider = realtimeDataProvider(
    fakeDataProvider<Resources>({ posts: [{ id: 1, title: "a" }] }),
    transport,
    { locks },
  );
  return { transport, locks: inMemory, dataProvider };
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  probe: Component,
  authProvider?: AuthProvider,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient, authProvider },
        { default: () => h(probe), layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const authProviderFor = (id: Identifier): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id }),
});

const holder = (wrapper: ReturnType<typeof mount>, testId: string) =>
  wrapper.find(`[data-testid="${testId}"]`).text();

describe("useLock", () => {
  function mountLock(
    dataProvider: ReturnType<typeof setup>["dataProvider"],
    run: (api: ReturnType<typeof useLock>) => Promise<unknown>,
    authProvider?: AuthProvider,
  ) {
    const outcome: { value?: unknown; error?: unknown } = {};
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const api = useLock();
          return () =>
            h("div", [
              h("p", { "data-testid": "loading" }, String(api.isLoading.value)),
              h(
                "p",
                { "data-testid": "error" },
                api.error.value?.message ?? "",
              ),
              h(
                "button",
                {
                  onClick: () =>
                    run(api).then(
                      (value) => {
                        outcome.value = value;
                      },
                      (error) => {
                        outcome.error = error;
                      },
                    ),
                },
                "go",
              ),
            ]);
        },
      }),
      authProvider,
    );
    return { wrapper, outcome };
  }

  it("locks with the explicit identity and no auth provider", async () => {
    const { dataProvider, locks } = setup();
    const { wrapper, outcome } = mountLock(dataProvider, (api) =>
      api.lock("posts", { id: 1, identity: "ann" }),
    );
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(outcome.value).toMatchObject({ recordId: 1, identity: "ann" });
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });

  it("falls back to the auth provider identity", async () => {
    const { dataProvider, locks } = setup();
    const { wrapper } = mountLock(
      dataProvider,
      (api) => api.lock("posts", { id: 1 }),
      authProviderFor("bob"),
    );
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "bob",
    });
  });

  it("rejects with a clear error when no identity is available", async () => {
    const { dataProvider, locks } = setup();
    const { wrapper, outcome } = mountLock(dataProvider, (api) =>
      api.lock("posts", { id: 1 }),
    );
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(outcome.error).toEqual(
      expect.objectContaining({ message: expect.stringMatching(/identity/) }),
    );
    expect(holder(wrapper, "error")).toMatch(/identity/);
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("a conflict is stored in error and rethrown", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { wrapper, outcome } = mountLock(dataProvider, (api) =>
      api.lock("posts", { id: 1, identity: "bob" }),
    );
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(outcome.error).toBeInstanceOf(LockConflictError);
    expect(holder(wrapper, "error")).toMatch(/locked by ann/);
  });

  it("isLoading is true while the call is in flight", async () => {
    let release: () => void = () => {};
    const { dataProvider } = setup((locks) => ({
      ...locks,
      lock: async (resource, params) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return locks.lock(resource, params);
      },
    }));
    const { wrapper } = mountLock(dataProvider, (api) =>
      api.lock("posts", { id: 1, identity: "ann" }),
    );
    expect(holder(wrapper, "loading")).toBe("false");

    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(holder(wrapper, "loading")).toBe("true");

    release();
    await flushPromises();
    expect(holder(wrapper, "loading")).toBe("false");
  });
});

describe("useUnlock", () => {
  function mountUnlock(
    dataProvider: ReturnType<typeof setup>["dataProvider"],
    identity: Identifier,
  ) {
    const outcome: { error?: unknown } = {};
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const api = useUnlock();
          return () =>
            h("div", [
              h(
                "p",
                { "data-testid": "error" },
                api.error.value?.message ?? "",
              ),
              h(
                "button",
                {
                  onClick: () =>
                    api.unlock("posts", { id: 1, identity }).catch((error) => {
                      outcome.error = error;
                    }),
                },
                "go",
              ),
            ]);
        },
      }),
    );
    return { wrapper, outcome };
  }

  it("releases a held lock", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { wrapper } = mountUnlock(dataProvider, "ann");
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("rejects when another identity holds the lock", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { wrapper, outcome } = mountUnlock(dataProvider, "bob");
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(outcome.error).toBeInstanceOf(LockConflictError);
    expect(holder(wrapper, "error")).toMatch(/locked by ann/);
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });
});

describe("useGetLock", () => {
  function mountGetLock(
    dataProvider: ReturnType<typeof setup>["dataProvider"],
    options: { enabled?: boolean } = {},
  ) {
    return mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const query = useGetLock<Resources, "posts">(
            "posts",
            { id: 1 },
            options,
          );
          return () =>
            h(
              "p",
              { "data-testid": "lock" },
              query.isSuccess.value
                ? String((query.data.value as Lock | null)?.identity ?? "free")
                : "pending",
            );
        },
      }),
    );
  }

  it("returns the current lock and null when the record is free", async () => {
    const { dataProvider, locks } = setup();
    const free = mountGetLock(dataProvider);
    await flushPromises();
    expect(holder(free, "lock")).toBe("free");

    await locks.lock("posts", { id: 1, identity: "ann" });
    const held = mountGetLock(dataProvider);
    await flushPromises();
    expect(holder(held, "lock")).toBe("ann");
  });

  it("does not fetch when enabled is false", async () => {
    const { dataProvider } = setup();
    const getLock = vi.spyOn(dataProvider, "getLock");
    const wrapper = mountGetLock(dataProvider, { enabled: false });
    await flushPromises();

    expect(getLock).not.toHaveBeenCalled();
    expect(holder(wrapper, "lock")).toBe("pending");
  });
});

describe("useGetLocks", () => {
  it("returns every lock of the resource", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    await locks.lock("posts", { id: 2, identity: "bob" });
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const query = useGetLocks<Resources, "posts">("posts");
          return () =>
            h(
              "ul",
              (query.data.value ?? []).map((lock) =>
                h("li", { key: String(lock.recordId) }, String(lock.identity)),
              ),
            );
        },
      }),
    );
    await flushPromises();

    expect(wrapper.findAll("li").map((li) => li.text())).toEqual([
      "ann",
      "bob",
    ]);
  });
});

describe("useGetLockLive", () => {
  it("updates when the lock is released through the lock provider", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const query = useGetLockLive<Resources, "posts">("posts", { id: 1 });
          return () =>
            h(
              "p",
              { "data-testid": "lock" },
              query.isSuccess.value
                ? String((query.data.value as Lock | null)?.identity ?? "free")
                : "pending",
            );
        },
      }),
    );
    await flushPromises();
    expect(holder(wrapper, "lock")).toBe("ann");

    await locks.unlock("posts", { id: 1, identity: "ann" });
    await flushPromises();
    expect(holder(wrapper, "lock")).toBe("free");
  });
});

describe("useGetLocksLive", () => {
  it("updates when a lock is taken", async () => {
    const { dataProvider, locks } = setup();
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const query = useGetLocksLive<Resources, "posts">("posts");
          return () =>
            h(
              "ul",
              (query.data.value ?? []).map((lock) =>
                h("li", { key: String(lock.recordId) }, String(lock.identity)),
              ),
            );
        },
      }),
    );
    await flushPromises();
    expect(wrapper.findAll("li")).toHaveLength(0);

    await locks.lock("posts", { id: 1, identity: "ann" });
    await flushPromises();
    expect(wrapper.findAll("li").map((li) => li.text())).toEqual(["ann"]);
  });
});

describe("useLockOnMount", () => {
  interface ProbeOptions {
    resource?: Ref<string | undefined>;
    id?: Ref<Identifier | undefined>;
    identity?: Ref<Identifier | undefined>;
    onLockError?: (error: Error) => void;
  }

  function probeWith(options: ProbeOptions = {}) {
    return defineComponent({
      setup() {
        const api = useLockOnMount(options);
        return () =>
          h("div", [
            h(
              "p",
              { "data-testid": "lock" },
              api.lock.value ? String(api.lock.value.identity) : "none",
            ),
            h("p", { "data-testid": "locking" }, String(api.isLocking.value)),
            h(
              "p",
              { "data-testid": "error" },
              api.lockError.value?.message ?? "",
            ),
          ]);
      },
    });
  }

  it("takes the lock on mount and releases it on unmount", async () => {
    const { dataProvider, locks } = setup();
    const wrapper = mountUnderAdmin(
      dataProvider,
      probeWith({
        resource: ref("posts"),
        id: ref(1),
        identity: ref("ann"),
      }),
    );
    expect(holder(wrapper, "locking")).toBe("true");
    await flushPromises();

    expect(holder(wrapper, "lock")).toBe("ann");
    expect(holder(wrapper, "locking")).toBe("false");
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });

    wrapper.unmount();
    await flushPromises();
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("reads resource and id from the resource and record contexts", async () => {
    const { dataProvider, locks } = setup();
    const Scope = defineComponent({
      setup() {
        provideResourceContext("posts");
        provideRecordContext({ id: 1, title: "a" });
        return () => h(probeWith({ identity: ref("ann") }));
      },
    });
    mountUnderAdmin(dataProvider, Scope);
    await flushPromises();

    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });

  it("surfaces a conflict when another identity holds the lock", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(
      dataProvider,
      probeWith({
        resource: ref("posts"),
        id: ref(1),
        identity: ref("bob"),
      }),
    );
    await flushPromises();

    expect(holder(wrapper, "lock")).toBe("none");
    expect(holder(wrapper, "locking")).toBe("false");
    expect(holder(wrapper, "error")).toMatch(/locked by ann/);
  });

  it("takes no lock without a resource, an id or an identity", async () => {
    const { dataProvider, locks } = setup();
    const lock = vi.spyOn(dataProvider, "lock");
    const cases: ProbeOptions[] = [
      { id: ref(1), identity: ref("ann") },
      { resource: ref("posts"), identity: ref("ann") },
      { resource: ref("posts"), id: ref(1) },
    ];
    for (const options of cases) {
      const wrapper = mountUnderAdmin(dataProvider, probeWith(options));
      await flushPromises();
      expect(holder(wrapper, "lock")).toBe("none");
      expect(holder(wrapper, "locking")).toBe("false");
    }

    expect(lock).not.toHaveBeenCalled();
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("releases a lock that lands after unmount", async () => {
    let land: () => void = () => {};
    const { dataProvider, locks } = setup((inMemory) => ({
      ...inMemory,
      lock: async (resource, params) => {
        await new Promise<void>((resolve) => {
          land = resolve;
        });
        return inMemory.lock(resource, params);
      },
    }));
    const wrapper = mountUnderAdmin(
      dataProvider,
      probeWith({
        resource: ref("posts"),
        id: ref(1),
        identity: ref("ann"),
      }),
    );
    await flushPromises();

    wrapper.unmount();
    land();
    await flushPromises();
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("calls onLockError on a failed lock", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const onLockError = vi.fn();
    mountUnderAdmin(
      dataProvider,
      probeWith({
        resource: ref("posts"),
        id: ref(1),
        identity: ref("bob"),
        onLockError,
      }),
    );
    await flushPromises();

    expect(onLockError).toHaveBeenCalledTimes(1);
    expect(onLockError.mock.calls[0]?.[0]).toBeInstanceOf(LockConflictError);
  });

  it("releases the old lock before taking one for a new id", async () => {
    const { dataProvider, locks } = setup();
    const id = ref<Identifier | undefined>(1);
    const wrapper = mountUnderAdmin(
      dataProvider,
      probeWith({
        resource: ref("posts"),
        id,
        identity: ref("ann"),
      }),
    );
    await flushPromises();
    expect(await locks.getLock("posts", { id: 1 })).not.toBeNull();

    id.value = 2;
    await nextTick();
    await flushPromises();

    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
    expect(await locks.getLock("posts", { id: 2 })).toMatchObject({
      identity: "ann",
    });
    expect(holder(wrapper, "lock")).toBe("ann");
  });

  it("takes the lock once an ambient record that was not loaded at setup arrives", async () => {
    const { dataProvider, locks } = setup();
    const record = ref<RecordValue>(undefined);
    const Scope = defineComponent({
      setup() {
        provideResourceContext("posts");
        provideRecordContext(record);
        return () => h(probeWith({ identity: ref("ann") }));
      },
    });
    const wrapper = mountUnderAdmin(dataProvider, Scope);
    await flushPromises();
    expect(holder(wrapper, "locking")).toBe("false");
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();

    record.value = { id: 1, title: "a" };
    await flushPromises();

    expect(holder(wrapper, "lock")).toBe("ann");
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });

  it("holds the lock when the identity changes while the first lock is in flight", async () => {
    let open: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const { dataProvider, locks } = setup((inMemory) => ({
      ...inMemory,
      lock: async (resource, params) => {
        await gate;
        return inMemory.lock(resource, params);
      },
    }));
    const identity = ref<Identifier | undefined>("ann");
    const wrapper = mountUnderAdmin(
      dataProvider,
      probeWith({ resource: ref("posts"), id: ref(1), identity }),
    );
    await flushPromises();

    identity.value = "bob";
    await nextTick();
    open();
    await flushPromises();

    expect(holder(wrapper, "error")).toBe("");
    expect(holder(wrapper, "lock")).toBe("bob");
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "bob",
    });
  });
});
