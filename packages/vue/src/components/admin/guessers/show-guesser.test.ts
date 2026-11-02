/**
 * `<ShowGuesser>` tests: the show page a resource's registered Zod schema
 * builds, mounted under a real `<Admin>`. Asserts the DOM and the data-provider
 * calls, never the styling.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import ShowGuesser, { type ShowGuesserProps } from "./show-guesser.vue";

const registry = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      views: z.number(),
      published: z.boolean(),
    }),
  },
  orders: {
    schema: z.object({
      id: z.number(),
      authorId: z.number(),
      note: z.string(),
      meta: z.object({ weight: z.number() }),
    }),
    references: { authorId: "users" },
  },
  tags: {},
  users: {
    schema: z.object({ id: z.number(), name: z.string() }),
  },
});

const seed = {
  posts: [{ id: 1, title: "alpha", views: 10, published: true }],
  orders: [{ id: 7, authorId: 3, note: "fragile", meta: { weight: 2 } }],
  users: [
    { id: 3, name: "Ada" },
    { id: 4, name: "Grace" },
  ],
};

function mountGuesser(props: ShowGuesserProps = {}) {
  const dataProvider = fakeDataProvider<typeof registry>(structuredClone(seed));
  const getOne = vi.spyOn(dataProvider, "getOne");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  // Props live in a ref so a test can rerender the guesser with new ones.
  const current = ref<ShowGuesserProps>(props);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider,
            registry,
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          { default: () => h(ShowGuesser, current.value) },
        ),
    }),
    { global: { plugins: [router] } },
  );
  return { wrapper, getOne, current };
}

afterEach(() => vi.restoreAllMocks());

/** Each `RecordField` as its label and the text of its value. */
const rows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll("[data-slot='record-field']").map((row) => {
    const [label, ...value] = row.element.children;
    return [
      label?.textContent?.trim(),
      value.map((v) => v.textContent?.trim()).join(""),
    ];
  });

async function mountLoaded(props: ShowGuesserProps) {
  const mounted = mountGuesser({ enableLog: false, ...props });
  await vi.waitFor(() =>
    expect(mounted.wrapper.find("[data-slot='record-field']").exists()).toBe(
      true,
    ),
  );
  return mounted;
}

describe("ShowGuesser", () => {
  it("renders a labeled value per schema field once the record loads", async () => {
    const { wrapper } = mountGuesser({
      resource: "posts",
      id: 1,
      enableLog: false,
    });
    expect(wrapper.find("[data-slot='record-field']").exists()).toBe(false);

    await vi.waitFor(() =>
      expect(wrapper.find("[data-slot='record-field']").exists()).toBe(true),
    );

    expect(rows(wrapper).map(([label]) => label)).toEqual([
      "Id",
      "Title",
      "Views",
      "Published",
    ]);
    expect(rows(wrapper)[1]).toEqual(["Title", "alpha"]);
    expect(rows(wrapper)[2]).toEqual(["Views", "10"]);
  });

  it("shows the id", async () => {
    const { wrapper } = await mountLoaded({ resource: "posts", id: 1 });

    expect(rows(wrapper)[0]).toEqual(["Id", "1"]);
  });

  it("renders a boolean through BooleanField", async () => {
    const { wrapper } = await mountLoaded({ resource: "posts", id: 1 });

    const icon = wrapper.get("[data-slot='boolean-field']");
    expect(icon.attributes("data-value")).toBe("true");
    expect(wrapper.text()).not.toContain("Yes");
  });

  it("renders a reference through ReferenceField", async () => {
    const { wrapper } = await mountLoaded({ resource: "orders", id: 7 });

    await vi.waitFor(() =>
      expect(wrapper.get("[data-slot='reference-field']").text()).toBe("Ada"),
    );
  });

  it("skips unsupported fields", async () => {
    const { wrapper } = await mountLoaded({ resource: "orders", id: 7 });

    expect(rows(wrapper).map(([label]) => label)).toEqual([
      "Id",
      "AuthorId",
      "Note",
    ]);
  });

  it("shows GuesserEmpty and fetches no record when the resource has no schema", async () => {
    const { wrapper, getOne } = mountGuesser({
      resource: "tags",
      id: 1,
      enableLog: false,
    });
    await flushPromises();

    expect(wrapper.get("h2").text()).toBe("No schema registered");
    expect(wrapper.text()).toContain("Register a Zod schema for tags");
    expect(wrapper.find("[data-slot='show']").exists()).toBe(false);
    expect(getOne).not.toHaveBeenCalled();
  });

  it("throws when neither the resource prop nor a resource context is set", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mountGuesser({ enableLog: false })).toThrow(/no resource/);
  });

  it("logs the generated code once per resource when enableLog is on", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { current } = mountGuesser({
      resource: "posts",
      id: 1,
      enableLog: true,
    });
    await flushPromises();

    expect(log).toHaveBeenCalledTimes(1);
    const printed = String(log.mock.calls[0]?.[0]);
    expect(printed).toContain('Guessed Show for "posts":');
    expect(printed).toContain('<RecordField source="title"');

    // A rerender with new props does not log again.
    current.value = {
      resource: "posts",
      id: 1,
      enableLog: true,
      title: "Post",
    };
    await flushPromises();
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("logs nothing when enableLog is false", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mountGuesser({ resource: "posts", id: 1, enableLog: false });
    await flushPromises();

    expect(log).not.toHaveBeenCalled();
  });
});
