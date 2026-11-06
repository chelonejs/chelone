/**
 * `createResourceComponents("posts")`, mounted under a real `<Admin>`: the
 * views it returns load their own resource with no `resource` prop.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "./admin/admin.vue";
import TextField from "./components/admin/fields/text-field.vue";
import TextInput from "./components/admin/inputs/text-input.vue";
import { createResourceComponents } from "./create-resource-components";
import { useListContext } from "./list/list-context";

function mountAdmin(render: () => unknown) {
  const dataProvider = fakeDataProvider({
    posts: [
      { id: 1, title: "Hello world" },
      { id: 2, title: "Second post" },
    ],
    users: [{ id: 1, name: "Ada" }],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  return mount(Harness, { global: { plugins: [router] } });
}

/** Renders the ambient list's record ids and titles. */
const ListRows = defineComponent({
  setup() {
    const list = useListContext();
    return () =>
      h(
        "ul",
        { id: "rows" },
        (list.data ?? []).map((record) =>
          h("li", String(record.title ?? record.id)),
        ),
      );
  },
});

describe("createResourceComponents", () => {
  it("an Edit from the factory loads its own resource with no resource prop", async () => {
    const posts = createResourceComponents("posts");
    const wrapper = mountAdmin(() => h(posts.Edit, { id: 1 }));
    await flushPromises();
    expect(wrapper.find("h2").text()).toBe("Hello world");
  });

  it("a bound view renders with its resource and passes slots on", async () => {
    const posts = createResourceComponents("posts");
    const wrapper = mountAdmin(() =>
      h(
        posts.Edit,
        { id: 1 },
        { default: () => h("p", { id: "slotted" }, "Body") },
      ),
    );
    await flushPromises();
    expect(wrapper.find("h2").text()).toBe("Hello world");
    expect(wrapper.find("#slotted").text()).toBe("Body");
  });

  it("a List from the factory lists its own resource", async () => {
    const posts = createResourceComponents("posts");
    const wrapper = mountAdmin(() => h(posts.List, null, () => h(ListRows)));
    await flushPromises();
    expect(wrapper.findAll("#rows li").map((li) => li.text())).toEqual([
      "Hello world",
      "Second post",
    ]);
  });

  it("a field and an input from the factory are the package's own components", () => {
    const posts = createResourceComponents("posts");
    expect(posts.TextField).toBe(TextField);
    expect(posts.TextInput).toBe(TextInput);
  });

  it("two factories for two resources keep their views apart", async () => {
    const posts = createResourceComponents("posts");
    const users = createResourceComponents("users");
    const wrapper = mountAdmin(() => [
      h("section", { id: "posts" }, h(posts.Show, { id: 1 })),
      h("section", { id: "users" }, h(users.Show, { id: 1 })),
    ]);
    await flushPromises();
    expect(wrapper.find("#posts h2").text()).toBe("Hello world");
    expect(wrapper.find("#users h2").text()).toBe("Ada");
  });
});
