/**
 * The default page heading of `<List>`, `<InfiniteList>`, `<Create>`, `<Edit>`
 * and `<Show>`, mounted under a real `<Admin>`: the resource label through
 * `chelone.page.*`, or the record representation once the record loads.
 */

import {
  type AnyCheloneI18n,
  createI18n,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Create from "./create.vue";
import Edit from "./edit.vue";
import InfiniteList from "./infinite-list.vue";
import List from "./list.vue";
import Show from "./show.vue";

const en = {
  "chelone.page.list": "{name} list",
  "chelone.page.create": "New {name}",
};

function makeI18n(
  extra: Record<string, string> = {},
  fr: Record<string, string> = {},
): AnyCheloneI18n {
  return createI18n({
    locale: "en",
    messages: { en: { ...en, ...extra }, fr },
  });
}

function mountAdmin(render: () => unknown, i18n?: AnyCheloneI18n) {
  const dataProvider = fakeDataProvider({
    posts: [{ id: 1, title: "Hello world" }],
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
      return () =>
        h(Admin, { dataProvider, queryClient, i18n }, { default: render });
    },
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const heading = (wrapper: ReturnType<typeof mountAdmin>) =>
  wrapper.find("h2").text();

describe("view titles", () => {
  it("a List titles itself with the plural resource label through chelone.page.list", async () => {
    const i18n = makeI18n(
      {},
      {
        "chelone.page.list": "Liste de {name}",
        "resources.posts.name": "articles",
      },
    );
    const wrapper = mountAdmin(() => h(List, { resource: "posts" }), i18n);
    await flushPromises();
    expect(heading(wrapper)).toBe("Posts list");

    i18n.setLocale("fr");
    await flushPromises();
    expect(heading(wrapper)).toBe("Liste de articles");
  });

  it("an InfiniteList titles itself as a List does", async () => {
    const wrapper = mountAdmin(
      () => h(InfiniteList, { resource: "posts" }),
      makeI18n(),
    );
    await flushPromises();
    expect(heading(wrapper)).toBe("Posts list");
  });

  it("a Create titles itself with the singular resource label through chelone.page.create", async () => {
    const wrapper = mountAdmin(
      () => h(Create, { resource: "posts" }),
      makeI18n(),
    );
    await flushPromises();
    expect(heading(wrapper)).toBe("New Post");
  });

  it("an Edit and a Show title themselves with the record representation once it loads", async () => {
    const edit = mountAdmin(() => h(Edit, { resource: "posts", id: 1 }));
    const show = mountAdmin(() => h(Show, { resource: "posts", id: 1 }));
    expect(edit.find("h2").text()).toBe("");
    expect(show.find("h2").text()).toBe("");
    await flushPromises();
    expect(heading(edit)).toBe("Hello world");
    expect(heading(show)).toBe("Hello world");
  });

  it("a resources.posts.name translation replaces the humanized label", async () => {
    const i18n = makeI18n({ "resources.posts.name": "Article" });
    const list = mountAdmin(() => h(List, { resource: "posts" }), i18n);
    const create = mountAdmin(() => h(Create, { resource: "posts" }), i18n);
    await flushPromises();
    expect(heading(list)).toBe("Article list");
    expect(heading(create)).toBe("New Article");
  });

  it("a title prop wins and an empty title renders no heading", async () => {
    const titled = mountAdmin(
      () => [
        h(List, { resource: "posts", title: "Custom list" }),
        h(Show, { resource: "posts", id: 1, title: "Custom show" }),
      ],
      makeI18n(),
    );
    await flushPromises();
    expect(titled.findAll("h2").map((h2) => h2.text())).toEqual([
      "Custom list",
      "Custom show",
    ]);

    const untitled = mountAdmin(
      () => [
        h(List, { resource: "posts", title: "" }),
        h(InfiniteList, { resource: "posts", title: "" }),
        h(Create, { resource: "posts", title: "" }),
        h(Edit, { resource: "posts", id: 1, title: "" }),
        h(Show, { resource: "posts", id: 1, title: "" }),
      ],
      makeI18n(),
    );
    await flushPromises();
    expect(untitled.find("h2").exists()).toBe(false);
  });
});
