/**
 * `<EditGuesser>` tests: the edit form a resource's registered Zod schema
 * builds, mounted under a real `<Admin>`. Asserts the DOM and the data-provider
 * calls, never the styling.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import EditGuesser, { type EditGuesserProps } from "./edit-guesser.vue";

const registry = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string().min(3, "Title is too short"),
      views: z.number(),
    }),
  },
  orders: {
    schema: z.object({
      id: z.number(),
      authorId: z.number(),
      status: z.enum(["open", "shipped"]),
      note: z.string(),
      meta: z.object({ weight: z.number() }),
    }),
    references: { authorId: "users" },
  },
  lists: {
    schema: z.object({
      id: z.number(),
      topicIds: z.array(z.number()).describe("Subjects"),
    }),
    references: { topicIds: "topics" },
  },
  topics: {
    schema: z.object({ id: z.number(), name: z.string() }),
  },
  tags: {},
  users: {
    schema: z.object({ id: z.number(), name: z.string() }),
  },
});

const seed = {
  posts: [{ id: 1, title: "alpha", views: 10 }],
  orders: [
    {
      id: 7,
      authorId: 3,
      status: "shipped" as const,
      note: "fragile",
      meta: { weight: 2 },
    },
  ],
  lists: [{ id: 1, topicIds: [] }],
  topics: [{ id: 1, name: "Maths" }],
  users: [
    { id: 3, name: "Ada" },
    { id: 4, name: "Grace" },
  ],
};

function mountGuesser(props: EditGuesserProps = {}) {
  const dataProvider = fakeDataProvider<typeof registry>(structuredClone(seed));
  const getOne = vi.spyOn(dataProvider, "getOne");
  const update = vi.spyOn(dataProvider, "update");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  // Props live in a ref so a test can rerender the guesser with new ones.
  const current = ref<EditGuesserProps>(props);
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
          { default: () => h(EditGuesser, current.value) },
        ),
    }),
    { global: { plugins: [router] } },
  );
  return { wrapper, getOne, update, current };
}

afterEach(() => vi.restoreAllMocks());

const labels = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll("label").map((label) => label.text());

const inputs = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAll("input")
    .map((input) => elementOf(input.element, HTMLInputElement));

async function mountLoaded(props: EditGuesserProps) {
  const mounted = mountGuesser({ enableLog: false, ...props });
  await vi.waitFor(() =>
    expect(mounted.wrapper.find("[role='toolbar']").exists()).toBe(true),
  );
  return mounted;
}

describe("EditGuesser", () => {
  it("renders an input per schema field once the record loads", async () => {
    const { wrapper } = mountGuesser({
      resource: "posts",
      id: 1,
      enableLog: false,
    });
    expect(wrapper.find("input").exists()).toBe(false);

    await vi.waitFor(() => expect(wrapper.find("input").exists()).toBe(true));

    expect(labels(wrapper)).toEqual(["Title", "Views"]);
    expect(wrapper.get("[role='toolbar'] button").text()).toBe("Save");
  });

  it("leaves the id out of the form", async () => {
    const { wrapper } = await mountLoaded({ resource: "posts", id: 1 });

    expect(inputs(wrapper)).toHaveLength(2);
    expect(labels(wrapper)).not.toContain("Id");
  });

  it("skips an unsupported field", async () => {
    const { wrapper } = await mountLoaded({ resource: "orders", id: 7 });

    expect(labels(wrapper)).toEqual(["AuthorId", "Status", "Note"]);
  });

  it("fills the inputs from the loaded record", async () => {
    const { wrapper } = await mountLoaded({ resource: "posts", id: 1 });

    await vi.waitFor(() =>
      expect(inputs(wrapper).map((input) => input.value)).toEqual([
        "alpha",
        "10",
      ]),
    );
  });

  it("renders a reference as a ReferenceInput", async () => {
    const { wrapper } = await mountLoaded({ resource: "orders", id: 7 });

    const select = wrapper.get("select[data-slot='native-select']");
    await vi.waitFor(() =>
      expect(select.findAll("option").map((option) => option.text())).toEqual([
        "Ada",
        "Grace",
      ]),
    );
  });

  it("labels a reference array from the schema describe text", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { wrapper } = await mountLoaded({ resource: "lists", id: 1 });

    expect(labels(wrapper)).toEqual(["Subjects"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders a select with the schema's choices", async () => {
    const { wrapper } = await mountLoaded({ resource: "orders", id: 7 });

    const select = wrapper.get("select[data-slot='select']");
    expect(
      select
        .findAll("option")
        .map((option) => option.element.value)
        .filter(Boolean),
    ).toEqual(["open", "shipped"]);
    await vi.waitFor(() =>
      expect(elementOf(select.element, HTMLSelectElement).value).toBe(
        "shipped",
      ),
    );
  });

  it("blocks a save that breaks the registry schema", async () => {
    const { wrapper, update } = await mountLoaded({
      resource: "posts",
      id: 1,
      redirectOnSave: false,
    });

    const title = wrapper.get("input");
    await title.setValue("ab");
    await title.trigger("blur");
    await wrapper.get("[role='toolbar'] button").trigger("click");
    await flushPromises();

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Title is too short"),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("saves the edited values through the data provider", async () => {
    const { wrapper, update } = await mountLoaded({
      resource: "posts",
      id: 1,
      redirectOnSave: false,
    });

    await wrapper.get("input").setValue("gamma");
    await wrapper.get("[role='toolbar'] button").trigger("click");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[0]).toBe("posts");
    expect(update.mock.calls[0]?.[1]).toMatchObject({
      id: 1,
      data: { title: "gamma", views: 10 },
    });
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
    expect(wrapper.find("[data-slot='edit']").exists()).toBe(false);
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
    expect(printed).toContain('Guessed Edit for "posts":');
    expect(printed).toContain('<TextInput source="title"');

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
