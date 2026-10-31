import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import Resource from "../admin/resource.vue";
import { type UseGetPathForRecordOptions, useGetPathForRecord } from ".";

const View = defineComponent({ render: () => h("div") });

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

async function mountProbe(
  options: UseGetPathForRecordOptions,
  authProvider?: AuthProvider,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/");
  const capture: { result?: ReturnType<typeof useGetPathForRecord> } = {};
  const Probe = defineComponent({
    setup() {
      capture.result = useGetPathForRecord(options);
      return () => null;
    },
  });
  mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
            authProvider,
          },
          {
            default: () => [
              h(Resource, {
                name: "posts",
                list: View,
                show: View,
                edit: View,
              }),
              h(Resource, { name: "comments", list: View, edit: View }),
              h(Resource, { name: "tags", list: View }),
              h(Probe),
            ],
            layout: () => h("div"),
          },
        ),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return capture;
}

describe("useGetPathForRecord", () => {
  it("an explicit link type builds that path", async () => {
    const edit = await mountProbe({
      resource: "posts",
      record: { id: 7 },
      link: "edit",
    });
    expect(edit.result?.value).toBe("/posts/7");

    const fromFn = await mountProbe({
      resource: "posts",
      record: { id: 7 },
      link: (_record, resource) => (resource === "posts" ? "show" : false),
    });
    expect(fromFn.result?.value).toBe("/posts/7/show");
  });

  it("link false and a missing record give false", async () => {
    const off = await mountProbe({
      resource: "posts",
      record: { id: 7 },
      link: false,
    });
    expect(off.result?.value).toBe(false);

    const missing = await mountProbe({
      resource: "posts",
      record: undefined,
      link: "show",
    });
    expect(missing.result?.value).toBe(false);
  });

  it("an omitted link infers show, then edit, then false", async () => {
    const show = await mountProbe({ resource: "posts", record: { id: 1 } });
    expect(show.result?.value).toBe("/posts/1/show");

    const edit = await mountProbe({ resource: "comments", record: { id: 2 } });
    expect(edit.result?.value).toBe("/comments/2");

    const none = await mountProbe({ resource: "tags", record: { id: 3 } });
    expect(none.result?.value).toBe(false);
  });

  it("a denied show access falls through to edit", async () => {
    const canAccess = vi.fn(
      async ({ action }: { action: string }) => action !== "show",
    );
    const capture = await mountProbe(
      { resource: "posts", record: { id: 1 } },
      makeAuthProvider({ canAccess }),
    );
    await vi.waitFor(() => expect(capture.result?.value).toBe("/posts/1"));
  });

  it("an explicit link fires no canAccess call", async () => {
    const canAccess = vi.fn(async (_params: { action: string }) => true);
    const capture = await mountProbe(
      { resource: "posts", record: { id: 1 }, link: "show" },
      makeAuthProvider({ canAccess }),
    );
    expect(capture.result?.value).toBe("/posts/1/show");
    // The index redirect asks for list access; the link must ask for no other.
    for (const [params] of canAccess.mock.calls) {
      expect(params).toMatchObject({ action: "list" });
    }
  });
});
