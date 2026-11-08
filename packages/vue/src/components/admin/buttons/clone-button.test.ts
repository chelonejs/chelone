/**
 * `<CloneButton>` links to the create page with the record (minus its id) in
 * `?source=`; `<Create>` reads it back, so the form opens pre-filled. Mounted
 * under a real `<Admin>` with the router sitting on the page under test.
 */

import {
  type AuthProvider,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { CheloneContextKey } from "../../../context";
import TextInput from "../inputs/text-input.vue";
import Create from "../view/create.vue";
import Edit from "../view/edit.vue";
import CloneButton from "./clone-button.vue";
import SaveButton from "./save-button.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const makeI18n = () =>
  createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.clone": "Clone",
        "chelone.action.save": "Save",
        "chelone.page.create": "Create {name}",
      }),
    },
  });

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

const sourceUrl = (source: string) =>
  `/posts/create?source=${encodeURIComponent(source)}`;

async function mountAt(
  url: string,
  resource: (dataProvider: ReturnType<typeof fakeDataProvider>) => VNodeChild,
  {
    authProvider,
    dataProvider = fakeDataProvider({ posts: [{ id: 1, title: "Alpha" }] }),
  }: {
    authProvider?: AuthProvider;
    dataProvider?: ReturnType<typeof fakeDataProvider>;
  } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(url);
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          queryClient: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
          i18n: makeI18n(),
        },
        { default: () => resource(dataProvider) },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, router, dataProvider };
}

/** A resource whose list view renders `children`, with the router on `/posts`. */
const mountButtons = (
  children: () => VNodeChild,
  options?: { authProvider?: AuthProvider },
) =>
  mountAt(
    "/posts",
    () =>
      h(Resource, {
        name: "posts",
        list: defineComponent({ setup: () => children }),
      }),
    options,
  );

const inputs = (wrapper: VueWrapper) =>
  wrapper
    .findAll("input")
    .map((input) => elementOf(input.element, HTMLInputElement).value);

const createView = (props: Record<string, unknown> = {}): Component =>
  defineComponent({
    setup: () => () =>
      h(
        Create,
        { resource: "posts", ...props },
        {
          default: () => [
            h(TextInput, { source: "title" }),
            h(TextInput, { source: "status" }),
          ],
        },
      ),
  });

describe("<Create> location seed", () => {
  it("seeds the form from the source search param", async () => {
    const { wrapper } = await mountAt(
      sourceUrl('{"title":"Copied","status":"draft"}'),
      () => h(Resource, { name: "posts", create: createView() }),
    );
    expect(inputs(wrapper)).toEqual(["Copied", "draft"]);
  });

  it("location keys win over the record prop", async () => {
    const { wrapper } = await mountAt(sourceUrl('{"title":"From URL"}'), () =>
      h(Resource, {
        name: "posts",
        create: createView({
          record: { title: "From prop", status: "published" },
        }),
      }),
    );
    expect(inputs(wrapper)).toEqual(["From URL", "published"]);
  });

  it("a malformed source param leaves the form empty", async () => {
    const { wrapper } = await mountAt(sourceUrl("{not json"), () =>
      h(Resource, { name: "posts", create: createView() }),
    );
    expect(inputs(wrapper)).toEqual(["", ""]);
  });

  it("renders without a router adapter", async () => {
    const Root = defineComponent({
      setup: () => () =>
        h(Create, { resource: "posts", record: { title: "Alpha" } }, () =>
          h(TextInput, { source: "title" }),
        ),
    });
    const wrapper = mount(Root, {
      global: {
        provide: {
          [CheloneContextKey]: {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
          },
        },
      },
    });
    mounted.push(wrapper);
    await flushPromises();
    expect(inputs(wrapper)).toEqual(["Alpha"]);
  });
});

describe("<CloneButton>", () => {
  it("links to the create page with the record minus its id in the source param", async () => {
    const { wrapper } = await mountButtons(() =>
      h(CloneButton, {
        resource: "posts",
        record: { id: 7, title: "A & B", tags: ["x"] },
      }),
    );
    const link = wrapper.get('a[aria-label="Clone"]');
    expect(link.text()).toBe("Clone");
    const href = link.attributes("href") ?? "";
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/posts/create");
    expect(JSON.parse(url.searchParams.get("source") ?? "")).toEqual({
      title: "A & B",
      tags: ["x"],
    });
    expect(href).toContain(
      `source=${encodeURIComponent('{"title":"A & B","tags":["x"]}')}`,
    );
  });

  it("renders nothing without a record id", async () => {
    // Wire-shaped on purpose: a record off the wire can have no id.
    const noId = JSON.parse('{"title":"no id"}');
    const { wrapper } = await mountButtons(() => [
      h(CloneButton, {
        resource: "posts",
        record: noId,
      }),
      h(CloneButton, { resource: "posts" }),
    ]);
    expect(wrapper.find('[data-slot="clone-button"]').exists()).toBe(false);
  });

  it("hides when create access is denied and shows when access control is unconfigured", async () => {
    const record = { id: 1, title: "a" };
    const denied = await mountButtons(
      () => h(CloneButton, { resource: "posts", record }),
      { authProvider: baseAuth({ canAccess: async () => false }) },
    );
    await flushPromises();
    expect(denied.wrapper.find('[data-slot="clone-button"]').exists()).toBe(
      false,
    );
    denied.wrapper.unmount();

    const open = await mountButtons(
      () => h(CloneButton, { resource: "posts", record }),
      { authProvider: baseAuth() },
    );
    await vi.waitFor(() =>
      expect(open.wrapper.find('a[aria-label="Clone"]').exists()).toBe(true),
    );
  });

  it("clicking it does not reach a parent click handler", async () => {
    const onParentClick = vi.fn();
    const { wrapper } = await mountButtons(() =>
      h("div", { onClick: onParentClick }, [
        h(CloneButton, { resource: "posts", record: { id: 1, title: "a" } }),
      ]),
    );
    await wrapper.get('a[aria-label="Clone"]').trigger("click");
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("cloning from the edit page pre-fills Create and saving calls create without an id", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    const create = vi.spyOn(dataProvider, "create");
    const PostEdit = defineComponent({
      setup: () => () =>
        h(
          Edit,
          { resource: "posts", id: 1 },
          {
            actions: () => h(CloneButton),
            default: () => h(TextInput, { source: "title" }),
          },
        ),
    });
    const PostCreate = defineComponent({
      setup: () => () =>
        h(
          Create,
          { resource: "posts" },
          {
            default: () => [h(TextInput, { source: "title" }), h(SaveButton)],
          },
        ),
    });
    const { wrapper } = await mountAt(
      "/posts/1",
      () => h(Resource, { name: "posts", edit: PostEdit, create: PostCreate }),
      { dataProvider },
    );

    await vi.waitFor(() =>
      expect(wrapper.find('a[aria-label="Clone"]').exists()).toBe(true),
    );
    await wrapper.get('a[aria-label="Clone"]').trigger("click");
    const save = '[data-slot="save-button"]';
    await vi.waitFor(() => expect(wrapper.find(save).exists()).toBe(true));
    expect(inputs(wrapper)).toEqual(["Alpha"]);

    await wrapper.get(save).trigger("click");
    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]?.[1]?.data).toEqual({ title: "Alpha" });
  });
});
