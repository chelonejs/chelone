/**
 * `<ListGuesser>` tests: the list page a resource's registered Zod schema
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
import ListGuesser, { type ListGuesserProps } from "./list-guesser.vue";

const registry = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      views: z.number(),
    }),
  },
  orders: {
    schema: z.object({
      id: z.number(),
      authorId: z.number(),
      published: z.boolean(),
      contact: z.string().email(),
      shippedOn: z.string().date(),
    }),
    references: { authorId: "users" },
  },
  parcels: {
    schema: z.object({
      id: z.number(),
      note: z.string(),
      meta: z.object({ weight: z.number() }),
    }),
  },
  articles: {
    schema: z.object({
      id: z.number(),
      headline: z.string().describe("Main headline"),
      body: z.string(),
    }),
  },
  tags: {},
  users: {
    schema: z.object({ id: z.number(), name: z.string() }),
  },
});

const seed = {
  posts: [
    { id: 1, title: "alpha", views: 10 },
    { id: 2, title: "beta", views: 20 },
  ],
  orders: [
    {
      id: 7,
      authorId: 3,
      published: true,
      contact: "ada@example.com",
      shippedOn: "2024-03-05",
    },
  ],
  parcels: [{ id: 1, note: "fragile", meta: { weight: 2 } }],
  articles: [{ id: 1, headline: "Hello", body: "World" }],
  users: [{ id: 3, name: "Ada" }],
};

function mountGuesser(props: ListGuesserProps = {}) {
  const dataProvider = fakeDataProvider<typeof registry>(structuredClone(seed));
  const getList = vi.spyOn(dataProvider, "getList");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  // Props live in a ref so a test can rerender the guesser with new ones.
  const current = ref<ListGuesserProps>(props);
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
          { default: () => h(ListGuesser, current.value) },
        ),
    }),
    { global: { plugins: [router] } },
  );
  return { wrapper, getList, current };
}

const headers = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll("thead th").map((th) => th.text());

const bodyRow = (wrapper: ReturnType<typeof mount>) => wrapper.get("tbody tr");

afterEach(() => vi.restoreAllMocks());

describe("ListGuesser", () => {
  it("renders a header per schema field in schema order", async () => {
    const { wrapper } = mountGuesser({ resource: "posts", enableLog: false });
    await flushPromises();

    expect(headers(wrapper)).toEqual(["Id", "Title", "Views"]);
  });

  it("keeps v-for columns in the DataTable header pass", async () => {
    const { wrapper } = mountGuesser({ resource: "posts", enableLog: false });

    // The headers come from the slot vnodes, before any record has loaded.
    expect(headers(wrapper)).toEqual(["Id", "Title", "Views"]);
    expect(wrapper.find("[data-slot='data-table-loading']").exists()).toBe(
      true,
    );

    await vi.waitFor(() => expect(wrapper.findAll("tbody tr")).toHaveLength(2));
    const cells = bodyRow(wrapper)
      .findAll("td")
      .map((td) => td.text());
    expect(cells).toEqual(["1", "alpha", "10"]);
  });

  it("renders reference, boolean, email and date cells with their fields", async () => {
    const { wrapper } = mountGuesser({ resource: "orders", enableLog: false });
    await vi.waitFor(() => expect(wrapper.text()).toContain("Ada"));

    const cells = bodyRow(wrapper).findAll("td");
    expect(headers(wrapper)).toEqual([
      "Id",
      "Author",
      "Published",
      "Contact",
      "Shipped on",
    ]);
    // ReferenceField resolves the author through the users resource.
    expect(cells[1]?.text()).toBe("Ada");
    // BooleanField draws an icon, not the word.
    expect(cells[2]?.find("svg").exists()).toBe(true);
    expect(cells[2]?.text()).toBe("");
    // EmailField links the address.
    expect(cells[3]?.get("a").attributes("href")).toBe(
      "mailto:ada@example.com",
    );
    // DateField formats the date rather than printing the raw string.
    expect(cells[4]?.text()).not.toBe("2024-03-05");
    expect(cells[4]?.text()).toMatch(/2024/);
  });

  it("skips unsupported fields", async () => {
    const { wrapper } = mountGuesser({ resource: "parcels", enableLog: false });
    await vi.waitFor(() => expect(wrapper.text()).toContain("fragile"));

    expect(headers(wrapper)).toEqual(["Id", "Note"]);
    expect(bodyRow(wrapper).findAll("td")).toHaveLength(2);
  });

  it("labels a column from the schema describe text", async () => {
    const { wrapper } = mountGuesser({
      resource: "articles",
      enableLog: false,
    });
    await flushPromises();

    expect(headers(wrapper)).toEqual(["Id", "Main headline", "Body"]);
  });

  it("shows GuesserEmpty and requests no list when the resource has no schema", async () => {
    const { wrapper, getList } = mountGuesser({
      resource: "tags",
      enableLog: false,
    });
    await flushPromises();

    expect(wrapper.get("h2").text()).toBe("No schema registered");
    expect(wrapper.text()).toContain("Register a Zod schema for tags");
    expect(wrapper.find("[data-slot='list']").exists()).toBe(false);
    expect(getList).not.toHaveBeenCalled();
  });

  it("throws when neither the resource prop nor a resource context is set", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mountGuesser({ enableLog: false })).toThrow(/no resource/);
  });

  it("logs the generated code once per resource when enableLog is on", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { current } = mountGuesser({ resource: "posts", enableLog: true });
    await flushPromises();

    expect(log).toHaveBeenCalledTimes(1);
    const printed = String(log.mock.calls[0]?.[0]);
    expect(printed).toContain('Guessed List for "posts":');
    expect(printed).toContain('<DataTableCol source="title" />');

    // A rerender with new props does not log again.
    current.value = { resource: "posts", enableLog: true, title: "Posts" };
    await flushPromises();
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("logs nothing when enableLog is false", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mountGuesser({ resource: "posts", enableLog: false });
    await flushPromises();

    expect(log).not.toHaveBeenCalled();
  });

  it("logs nothing for a resource with no schema", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mountGuesser({ resource: "tags", enableLog: true });
    await flushPromises();

    expect(log).not.toHaveBeenCalled();
  });

  it("passes perPage and title through to List", async () => {
    const { wrapper, getList } = mountGuesser({
      resource: "posts",
      perPage: 1,
      title: "All the posts",
      enableLog: false,
    });
    await vi.waitFor(() => expect(getList).toHaveBeenCalled());
    await flushPromises();

    expect(wrapper.get("h2").text()).toBe("All the posts");
    expect(getList.mock.calls[0]?.[1]).toMatchObject({
      pagination: { page: 1, perPage: 1 },
    });
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });
});
