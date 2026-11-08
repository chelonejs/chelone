/**
 * `<UpdateButton>` — patches the record in view with fixed data. Undoable by
 * default (cache patched now, Undo notification, server call deferred);
 * `pessimistic` and `optimistic` go through a confirm dialog first.
 *
 * Each test mounts an `<Edit>` route under `<Admin>`. The undoable
 * notification's `undo`/`onClose` callbacks are captured off the store's
 * `notify` spy, so the Undo window is driven deterministically.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
  type NotificationStore,
  type NotifyOptions,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import TextInput from "../inputs/text-input.vue";
import Edit from "../view/edit.vue";
import UpdateButton from "./update-button.vue";

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

const messages = defineMessages({
  "chelone.action.update": "Update",
  "chelone.action.confirm": "Confirm",
  "chelone.message.bulk_update_title": "Update this post?",
  "chelone.message.bulk_update_content": "The post will be patched.",
});

const seed = () => ({
  posts: [{ id: 1, title: "Alpha", views: 10 }],
});

async function mountButton({
  button,
  extraMessages = {},
  dataProvider = fakeDataProvider(seed()),
  authProvider,
}: {
  extraMessages?: Record<string, string>;
  button: () => VNodeChild;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/posts/1");
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
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          queryClient,
          notifications,
          i18n: createI18n({
            locale: "en",
            messages: { en: { ...messages, ...extraMessages } },
          }),
        },
        { default: () => h(Resource, { name: "posts", edit: PostEdit }) },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, queryClient, notify };
}

const viewsReset: Partial<LooseRecord> = { views: 0 };

const updateButton = (props: Record<string, unknown> = {}) =>
  h(UpdateButton, { data: viewsReset, ...props });

const updateSelector = '[data-slot="update-button"]';
const confirmSelector = '[data-slot="confirm-accept"]';
const dialogSelector = '[role="alertdialog"]';

async function findUpdate(wrapper: VueWrapper) {
  await vi.waitFor(() =>
    expect(wrapper.find(updateSelector).exists()).toBe(true),
  );
  return wrapper.get(updateSelector);
}

async function confirm(wrapper: VueWrapper) {
  await vi.waitFor(() =>
    expect(wrapper.find(confirmSelector).exists()).toBe(true),
  );
  await wrapper.get(confirmSelector).trigger("click");
}

/** The cached `getOne` record for post 1, whatever id type the page keyed it with. */
function cachedPost(queryClient: QueryClient) {
  const [entry] = queryClient.getQueriesData<{ id: number; views: number }>({
    queryKey: ["posts", "getOne"],
  });
  return entry?.[1];
}

type NotifySpy = MockInstance<NotificationStore["notify"]>;

function captureUndoable(notify: NotifySpy): NotifyOptions {
  const call = notify.mock.calls.find((args) => args[1]?.undoable);
  const options = call?.[1];
  if (!options) throw new Error("no undoable notification was enqueued");
  return options;
}

/** A provider whose `update` stays pending until `settle` is called. */
function deferredUpdate() {
  const dataProvider = fakeDataProvider(seed());
  let settle: (error?: Error) => void = () => {};
  const update = vi.spyOn(dataProvider, "update").mockImplementation(
    (_resource, params) =>
      new Promise((resolve, reject) => {
        settle = (error) =>
          error ? reject(error) : resolve({ data: { id: 1, ...params.data } });
      }),
  );
  return { dataProvider, update, settle: (error?: Error) => settle(error) };
}

describe("<UpdateButton>", () => {
  it("undoable mode patches the record in the cache at once and shows an Undo notification", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper, queryClient, notify } = await mountButton({
      button: () => updateButton(),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");

    expect(cachedPost(queryClient)?.views).toBe(0);
    expect(wrapper.find(dialogSelector).exists()).toBe(false);
    expect(captureUndoable(notify).undoable).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("undoable mode defers dataProvider.update until the Undo window closes", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper, notify } = await mountButton({
      button: () => updateButton(),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");
    expect(update).not.toHaveBeenCalled();

    captureUndoable(notify).onClose?.();
    await flushPromises();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { views: 0 },
      previousData: { id: 1, title: "Alpha", views: 10 },
    });
  });

  it("undoing restores the record and never calls dataProvider.update", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper, queryClient, notify } = await mountButton({
      button: () => updateButton(),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");
    expect(cachedPost(queryClient)?.views).toBe(0);

    captureUndoable(notify).undo?.();
    await flushPromises();

    expect(cachedPost(queryClient)?.views).toBe(10);
    expect(update).not.toHaveBeenCalled();
  });

  it("pessimistic mode asks for confirmation and updates only after confirming", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic" }),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");

    expect(wrapper.text()).toContain("Update this post?");
    expect(wrapper.text()).toContain("The post will be patched.");
    expect(update).not.toHaveBeenCalled();

    await confirm(wrapper);

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { views: 0 },
      previousData: { id: 1, title: "Alpha", views: 10 },
    });
  });

  it("pessimistic mode keeps the dialog open until the call settles", async () => {
    const { dataProvider, update, settle } = deferredUpdate();
    const { wrapper } = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic" }),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");
    await confirm(wrapper);
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    expect(wrapper.find(dialogSelector).exists()).toBe(true);

    settle();

    await vi.waitFor(() =>
      expect(wrapper.find(dialogSelector).exists()).toBe(false),
    );
  });

  it("optimistic mode closes the dialog on confirm", async () => {
    const { dataProvider, update } = deferredUpdate();
    const { wrapper } = await mountButton({
      button: () => updateButton({ mutationMode: "optimistic" }),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");
    await confirm(wrapper);

    await vi.waitFor(() =>
      expect(wrapper.find(dialogSelector).exists()).toBe(false),
    );
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
  });

  it("notifies updated on success and an error when the update fails", async () => {
    const ok = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic" }),
    });
    await (await findUpdate(ok.wrapper)).trigger("click");
    await confirm(ok.wrapper);
    await vi.waitFor(() =>
      expect(ok.notify).toHaveBeenCalledWith(
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ),
    );

    const dataProvider = fakeDataProvider(seed());
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("boom"));
    const failed = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic" }),
      dataProvider,
    });
    await (await findUpdate(failed.wrapper)).trigger("click");
    await confirm(failed.wrapper);
    await vi.waitFor(() =>
      expect(failed.notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(failed.notify).not.toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.anything(),
    );
  });

  it("emits success with the result and error with the failure", async () => {
    const onSuccess = vi.fn();
    const ok = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic", onSuccess }),
    });
    await (await findUpdate(ok.wrapper)).trigger("click");
    await confirm(ok.wrapper);
    await vi.waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, views: 0 }),
      ),
    );

    const onError = vi.fn();
    const dataProvider = fakeDataProvider(seed());
    const error = new Error("boom");
    vi.spyOn(dataProvider, "update").mockRejectedValue(error);
    const failed = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic", onError }),
      dataProvider,
    });
    await (await findUpdate(failed.wrapper)).trigger("click");
    await confirm(failed.wrapper);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error));
  });

  it("onSuccess is not called for an undoable update", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { wrapper, notify } = await mountButton({
      button: () => updateButton({ onSuccess, onError }),
    });

    await (await findUpdate(wrapper)).trigger("click");
    captureUndoable(notify).onClose?.();
    await flushPromises();

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("the button sends the record id and previousData", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => updateButton({ mutationMode: "optimistic" }),
      dataProvider,
    });

    await (await findUpdate(wrapper)).trigger("click");
    await confirm(wrapper);

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { views: 0 },
      previousData: { id: 1, title: "Alpha", views: 10 },
    });
  });

  it("is disabled while the update is pending", async () => {
    const { dataProvider, update, settle } = deferredUpdate();
    const { wrapper } = await mountButton({
      button: () => updateButton({ mutationMode: "optimistic" }),
      dataProvider,
    });

    const button = await findUpdate(wrapper);
    expect(button.attributes("disabled")).toBeUndefined();
    await button.trigger("click");
    await confirm(wrapper);
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(wrapper.get(updateSelector).attributes("disabled")).toBeDefined(),
    );

    settle();

    await vi.waitFor(() =>
      expect(
        wrapper.get(updateSelector).attributes("disabled"),
      ).toBeUndefined(),
    );
  });

  it("emits click after the update is started", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const startedWhenClicked = vi.fn();
    // `notify` is assigned once `mountButton` returns, before any click.
    let notify: NotifySpy | undefined;
    const mountedButton = await mountButton({
      button: () =>
        updateButton({
          onClick: () =>
            startedWhenClicked(
              notify?.mock.calls.some((args) => args[1]?.undoable),
            ),
        }),
      dataProvider,
    });
    notify = mountedButton.notify;

    await (await findUpdate(mountedButton.wrapper)).trigger("click");

    expect(startedWhenClicked).toHaveBeenCalledWith(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("renders nothing without a record id", async () => {
    const { wrapper } = await mountButton({
      button: () => [
        updateButton({ record: { title: "no id" }, label: "No id" }),
        updateButton({ label: "Has id" }),
      ],
    });

    await vi.waitFor(() => expect(wrapper.text()).toContain("Has id"));
    expect(wrapper.text()).not.toContain("No id");
    expect(wrapper.findAll(updateSelector)).toHaveLength(1);
  });

  it("hides when edit access is denied and shows when access control is unconfigured", async () => {
    const denied = await mountButton({
      button: () => updateButton(),
      authProvider: baseAuth({
        canAccess: async ({ action }) => action !== "edit",
      }),
    });
    await vi.waitFor(() =>
      expect(denied.wrapper.find('[data-slot="edit"]').exists()).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(denied.wrapper.find(updateSelector).exists()).toBe(false);

    const open = await mountButton({
      button: () => updateButton(),
      authProvider: baseAuth(),
    });
    expect(await findUpdate(open.wrapper)).toBeTruthy();
  });

  it("clicking it does not reach a parent click handler", async () => {
    const onParentClick = vi.fn();
    const { wrapper } = await mountButton({
      button: () =>
        h("div", { onClick: onParentClick }, [
          updateButton({ mutationMode: "pessimistic" }),
        ]),
    });

    await (await findUpdate(wrapper)).trigger("click");
    await confirm(wrapper);

    await vi.waitFor(() =>
      expect(wrapper.find(dialogSelector).exists()).toBe(false),
    );
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("uses a resource-specific label key before the default", async () => {
    const { wrapper } = await mountButton({
      button: () => updateButton(),
      extraMessages: { "resources.posts.action.update": "Reset views" },
    });

    expect((await findUpdate(wrapper)).text()).toBe("Reset views");
  });

  it("fills the singular resource name into the confirm copy", async () => {
    const { wrapper } = await mountButton({
      button: () => updateButton({ mutationMode: "pessimistic" }),
      extraMessages: {
        "chelone.message.bulk_update_title": "Update {name}?",
        "chelone.message.bulk_update_content": "Patch this {name}.",
      },
    });

    await (await findUpdate(wrapper)).trigger("click");

    expect(wrapper.get('[data-slot="confirm-title"]').text()).toBe(
      "Update Post?",
    );
    expect(wrapper.get('[data-slot="confirm-content"]').text()).toBe(
      "Patch this Post.",
    );
  });
});
