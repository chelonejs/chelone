/**
 * `<DualApprovalButton>` — records the signed-in user as one more approver on
 * the record in view. Each test mounts an `<Edit>` route under `<Admin>` so the
 * button reads the ambient record, resource and identity.
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
import DualApprovalButton from "./dual-approval-button.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const authProvider = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada" }),
  ...over,
});

const seed = (post: Record<string, unknown> = {}) => ({
  posts: [
    { id: 1, title: "Alpha", approvers: ["2"], status: "draft", ...post },
  ],
});

async function mountButton({
  button,
  dataProvider = fakeDataProvider(seed()),
  auth = authProvider(),
}: {
  button: () => VNodeChild;
  dataProvider?: DataProvider;
  auth?: AuthProvider;
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
          authProvider: auth,
          queryClient,
          notifications,
          i18n: createI18n({ locale: "en", messages: { en: {} } }),
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
  return { wrapper, notify };
}

const approval = (props: Record<string, unknown> = {}) =>
  h(DualApprovalButton, props);

const buttonSelector = '[data-slot="dual-approval-button"]';

async function findButton(wrapper: VueWrapper) {
  await vi.waitFor(() =>
    expect(wrapper.find(buttonSelector).exists()).toBe(true),
  );
  return wrapper.get(buttonSelector);
}

/** A provider whose `update` stays pending until `settle` is called. */
function deferredUpdate() {
  const dataProvider = fakeDataProvider(seed());
  let settle: () => void = () => {};
  const update = vi.spyOn(dataProvider, "update").mockImplementation(
    (_resource, params) =>
      new Promise((resolve) => {
        settle = () => resolve({ data: { id: 1, ...params.data } } as never);
      }),
  );
  return { dataProvider, update, settle: () => settle() };
}

describe("DualApprovalButton", () => {
  it("shows Approve and the count of approvers out of required", async () => {
    const { wrapper } = await mountButton({ button: () => approval() });

    const button = await findButton(wrapper);

    expect(button.text()).toContain("Approve");
    expect(button.text()).toContain("1 of 2");
    expect(button.attributes("disabled")).toBeUndefined();
  });

  it("updates the record with the approver list and the pending status", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => approval({ required: 3 }),
      dataProvider,
    });

    await (await findButton(wrapper)).trigger("click");

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({
          id: 1,
          data: { approvers: ["2", 1], status: "pending" },
          previousData: expect.objectContaining({ approvers: ["2"] }),
        }),
      ),
    );
  });

  it("an approval sends the record as previousData", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => approval(),
      dataProvider,
    });

    await (await findButton(wrapper)).trigger("click");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].previousData).toEqual({
      id: 1,
      title: "Alpha",
      approvers: ["2"],
      status: "draft",
    });
  });

  it("sets the approved status on the approval that reaches required", async () => {
    const dataProvider = fakeDataProvider(seed());
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () => approval({ required: 2 }),
      dataProvider,
    });

    await (await findButton(wrapper)).trigger("click");

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({
          data: { approvers: ["2", 1], status: "approved" },
        }),
      ),
    );
  });

  it("writes the configured sources and values", async () => {
    const dataProvider = fakeDataProvider(
      seed({ signoffs: [], stage: "open" }),
    );
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountButton({
      button: () =>
        approval({
          required: 1,
          approverSource: "signoffs",
          statusSource: "stage",
          approvedValue: "done",
        }),
      dataProvider,
    });

    await (await findButton(wrapper)).trigger("click");

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({
          data: { signoffs: [1], stage: "done" },
        }),
      ),
    );
  });

  it("is disabled for a user who already approved, even when the stored ids are numbers", async () => {
    const { wrapper } = await mountButton({
      button: () => approval({ required: 3 }),
      dataProvider: fakeDataProvider(seed({ approvers: [1] })),
    });

    const button = await findButton(wrapper);

    await vi.waitFor(() =>
      expect(wrapper.get(buttonSelector).attributes("disabled")).toBeDefined(),
    );
    expect(button.element.parentElement?.textContent).toContain(
      "You already approved",
    );
  });

  it("is disabled without an identity", async () => {
    const { wrapper } = await mountButton({
      button: () => approval(),
      auth: authProvider({ getIdentity: undefined }),
    });

    await findButton(wrapper);

    expect(wrapper.get(buttonSelector).attributes("disabled")).toBeDefined();
  });

  it("shows Fully approved once the threshold is met", async () => {
    const { wrapper } = await mountButton({
      button: () => approval({ required: 2 }),
      dataProvider: fakeDataProvider(seed({ approvers: ["2", "3"] })),
    });

    const button = await findButton(wrapper);

    expect(button.text()).toContain("Fully approved (2 of 2)");
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("renders nothing without edit access", async () => {
    const { wrapper } = await mountButton({
      button: () => approval(),
      auth: authProvider({
        canAccess: async ({ action }) => action !== "edit",
      }),
    });

    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="edit"]').exists()).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.find(buttonSelector).exists()).toBe(false);
  });

  it("notifies an error and keeps the count when the update fails", async () => {
    const dataProvider = fakeDataProvider(seed());
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("boom"));
    const { wrapper, notify } = await mountButton({
      button: () => approval({ required: 3 }),
      dataProvider,
    });

    await (await findButton(wrapper)).trigger("click");

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(wrapper.get(buttonSelector).text()).toContain("1 of 3");
  });

  it("is disabled while its update is pending", async () => {
    const { dataProvider, update, settle } = deferredUpdate();
    const { wrapper } = await mountButton({
      button: () => approval({ required: 3 }),
      dataProvider,
    });

    await (await findButton(wrapper)).trigger("click");
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(wrapper.get(buttonSelector).attributes("disabled")).toBeDefined(),
    );

    settle();

    await vi.waitFor(() =>
      expect(
        wrapper.get(buttonSelector).attributes("disabled"),
      ).toBeUndefined(),
    );
  });
});
