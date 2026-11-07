/**
 * `<StatusTransitionButton>` — a menu of the states the record in view may move
 * to next. Each test mounts an `<Edit>` route under `<Admin>` so the button
 * reads the ambient record and resource.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import TextInput from "../inputs/text-input.vue";
import Edit from "../view/edit.vue";
import StatusTransitionButton from "./status-transition-button.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

const seed = (post: Record<string, unknown> = {}) => ({
  posts: [{ id: 1, title: "Alpha", status: "draft", ...post }],
});

const transitions = {
  draft: ["review", "published"],
  review: ["draft", "published"],
};

async function mountButton({
  button,
  dataProvider = fakeDataProvider(seed()),
  authProvider,
  path = "/posts/1",
}: {
  /** `/posts` mounts the button on the list page, where no record is in scope. */
  path?: string;
  button: () => VNodeChild;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const notifications = createNotificationStore();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(path);
  const PostEdit = defineComponent({
    setup: () => () =>
      h(
        Edit,
        { resource: "posts", id: 1 },
        {
          actions: button,
          default: () => h(TextInput, { source: "title" }),
        },
      ),
  });
  const PostList = defineComponent({
    setup: () => () => h("div", { "data-slot": "list-page" }, [button()]),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          queryClient,
          notifications,
          i18n: createI18n({ locale: "en", messages: { en: {} } }),
        },
        {
          default: () =>
            h(Resource, { name: "posts", edit: PostEdit, list: PostList }),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper };
}

const transition = (props: Record<string, unknown> = {}) =>
  h(StatusTransitionButton, { transitions, ...props });

const triggerSelector = '[data-slot="status-transition-trigger"]';
const itemSelector = '[data-slot="status-transition-item"]';
const acceptSelector = '[data-slot="confirm-accept"]';
const dialogSelector = '[role="alertdialog"]';

async function findTrigger(wrapper: VueWrapper) {
  await vi.waitFor(() =>
    expect(wrapper.find(triggerSelector).exists()).toBe(true),
  );
  return wrapper.get(triggerSelector);
}

async function openMenu(wrapper: VueWrapper) {
  await (await findTrigger(wrapper)).trigger("click");
  await vi.waitFor(() =>
    expect(wrapper.find(itemSelector).exists()).toBe(true),
  );
}

const items = (wrapper: VueWrapper) =>
  wrapper.findAll(itemSelector).map((item) => item.text());

describe("StatusTransitionButton", () => {
  it("shows the current status on the trigger", async () => {
    const { wrapper } = await mountButton({ button: () => transition() });

    expect((await findTrigger(wrapper)).text()).toContain("draft");
  });

  it("lists the allowed next states in the menu", async () => {
    const { wrapper } = await mountButton({ button: () => transition() });

    expect(wrapper.find(itemSelector).exists()).toBe(false);
    await openMenu(wrapper);

    expect(items(wrapper)).toEqual(["review", "published"]);
  });

  it("drops a state whose guard returns false", async () => {
    const { wrapper } = await mountButton({
      button: () => transition({ guards: { "draft->published": () => false } }),
    });

    await openMenu(wrapper);

    expect(items(wrapper)).toEqual(["review"]);
  });

  it("disables the trigger when no transition is allowed", async () => {
    const { wrapper } = await mountButton({
      button: () => transition(),
      dataProvider: fakeDataProvider(seed({ status: "published" })),
    });

    const trigger = await findTrigger(wrapper);

    expect(trigger.attributes("disabled")).toBeDefined();
    await trigger.trigger("click");
    expect(wrapper.find(itemSelector).exists()).toBe(false);
  });

  it("updates the record with the chosen state and previousData", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => transition(),
      dataProvider,
    });

    await openMenu(wrapper);
    await wrapper.findAll(itemSelector)[0]?.trigger("click");

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith("posts", {
        id: 1,
        data: { status: "review" },
        previousData: expect.objectContaining({ id: 1, status: "draft" }),
      }),
    );
  });

  it("writes the configured source", async () => {
    const dataProvider = fakeDataProvider(seed({ state: "a" }));
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => transition({ source: "state", transitions: { a: ["b"] } }),
      dataProvider,
    });

    await openMenu(wrapper);
    await wrapper.get(itemSelector).trigger("click");

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ data: { state: "b" } }),
      ),
    );
  });

  it("asks for confirmation first with confirm and updates nothing on cancel", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => transition({ confirm: true }),
      dataProvider,
    });

    await openMenu(wrapper);
    await wrapper.findAll(itemSelector)[0]?.trigger("click");

    await vi.waitFor(() =>
      expect(wrapper.find(dialogSelector).exists()).toBe(true),
    );
    expect(wrapper.get(dialogSelector).text()).toContain("Change status?");
    expect(wrapper.get(dialogSelector).text()).toContain("Move to review?");
    expect(update).not.toHaveBeenCalled();

    await wrapper.get('[data-slot="confirm-cancel"]').trigger("click");
    await flushPromises();
    expect(wrapper.find(dialogSelector).exists()).toBe(false);
    expect(update).not.toHaveBeenCalled();

    await openMenu(wrapper);
    await wrapper.findAll(itemSelector)[0]?.trigger("click");
    await vi.waitFor(() =>
      expect(wrapper.find(acceptSelector).exists()).toBe(true),
    );
    await wrapper.get(acceptSelector).trigger("click");
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ data: { status: "review" } }),
      ),
    );
  });

  it("emits transition after the update resolves and not when it fails", async () => {
    const onTransition = vi.fn();
    const ok = await mountButton({
      button: () => transition({ onTransition }),
    });
    await openMenu(ok.wrapper);
    await ok.wrapper.findAll(itemSelector)[0]?.trigger("click");
    await vi.waitFor(() => expect(onTransition).toHaveBeenCalledTimes(1));
    expect(onTransition).toHaveBeenCalledWith(
      "draft",
      "review",
      expect.objectContaining({ id: 1 }),
    );

    const failing = vi.fn();
    const dataProvider = fakeDataProvider(seed());
    const update = vi
      .spyOn(dataProvider, "update")
      .mockRejectedValue(new Error("boom"));
    const failed = await mountButton({
      button: () => transition({ onTransition: failing }),
      dataProvider,
    });
    await openMenu(failed.wrapper);
    await failed.wrapper.findAll(itemSelector)[0]?.trigger("click");
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    await flushPromises();
    expect(failing).not.toHaveBeenCalled();
  });

  it("shows a mapped label and an unmapped raw state", async () => {
    const { wrapper } = await mountButton({
      button: () =>
        transition({ labels: { draft: "Draft", review: "In review" } }),
    });

    expect((await findTrigger(wrapper)).text()).toContain("Draft");
    await openMenu(wrapper);

    expect(items(wrapper)).toEqual(["In review", "published"]);
  });

  it("renders nothing without a record or edit access", async () => {
    const noRecord = await mountButton({
      path: "/posts",
      button: () => transition(),
    });
    await vi.waitFor(() =>
      expect(noRecord.wrapper.find('[data-slot="list-page"]').exists()).toBe(
        true,
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(noRecord.wrapper.find(triggerSelector).exists()).toBe(false);

    const denied = await mountButton({
      button: () => transition(),
      authProvider: baseAuth({
        canAccess: async ({ action }) => action !== "edit",
      }),
    });
    await vi.waitFor(() =>
      expect(denied.wrapper.find('[data-slot="edit"]').exists()).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(denied.wrapper.find(triggerSelector).exists()).toBe(false);
  });
});
