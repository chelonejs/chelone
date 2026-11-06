/**
 * `<EditLive>` mounted under a real `<Admin>` over a `realtimeDataProvider` on
 * a `memoryTransport`. Cases assert the form's input, the router location and
 * how often the provider was asked for the record.
 */

import {
  addEventsForMutations,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import { useCheloneFormContext } from "../../../form/form-context";
import SaveButton from "../buttons/save-button.vue";
import TextInput from "../inputs/text-input.vue";
import Edit from "../view/edit.vue";
import EditLive from "./edit-live.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function setup() {
  const transport = memoryTransport();
  const base = fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  });
  const dataProvider = addEventsForMutations(
    realtimeDataProvider(base, transport),
    transport,
  );
  return { transport, dataProvider };
}

const ResetButton = defineComponent({
  setup() {
    const { form } = useCheloneFormContext();
    return () =>
      h(
        "button",
        {
          type: "button",
          "data-testid": "reset",
          onClick: () => form.ambient.reset(),
        },
        "Reset",
      );
  },
});

const fields = () => [h(TextInput, { source: "title" }), h(ResetButton)];
const toolbar = () => h(SaveButton);

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/posts", component: { render: () => null } },
      { path: "/posts/:id", component: { render: () => null } },
    ],
  });
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  render: () => unknown,
  router = makeRouter(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: render, layout: () => h("div") },
      ),
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, router };
}

const input = (wrapper: ReturnType<typeof mountUnderAdmin>["wrapper"]) =>
  wrapper.find('input[type="text"]');
const value = (wrapper: ReturnType<typeof mountUnderAdmin>["wrapper"]) =>
  elementOf(input(wrapper).element, HTMLInputElement).value;

const rename = (
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  id: number,
  title: string,
) =>
  dataProvider.update("posts", {
    id,
    data: { title },
    previousData: { id, title: "" },
  });

const editLive = (props: Record<string, unknown> = {}) =>
  h(
    EditLive,
    { resource: "posts", id: 1, redirectOnSave: false, ...props },
    { default: fields, toolbar },
  );

describe("<EditLive>", () => {
  it("renders the form like <Edit> and still redirects on save", async () => {
    const { dataProvider } = setup();
    const live = mountUnderAdmin(dataProvider, () =>
      h(EditLive, { resource: "posts", id: 1 }, { default: fields, toolbar }),
    );
    const plain = mountUnderAdmin(dataProvider, () =>
      h(Edit, { resource: "posts", id: 1 }, { default: fields, toolbar }),
    );
    await flushPromises();

    expect(value(live.wrapper)).toBe("a");
    expect(live.wrapper.find('[data-slot="edit"]').text()).toBe(
      plain.wrapper.find('[data-slot="edit"]').text(),
    );

    await input(live.wrapper).setValue("typed");
    await live.wrapper.find('[data-slot="save-button"]').trigger("click");
    await vi.waitFor(() => {
      expect(live.router.currentRoute.value.path).toBe("/posts");
    });
  });

  it("refetches and shows the new value when the record changes and the form is clean", async () => {
    const { dataProvider } = setup();
    const { wrapper } = mountUnderAdmin(dataProvider, () => editLive());
    await flushPromises();
    expect(value(wrapper)).toBe("a");

    await rename(dataProvider, 1, "a2");
    await flushPromises();

    expect(value(wrapper)).toBe("a2");
  });

  it("keeps a typed value when the record changes while the form is dirty", async () => {
    const { dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const { wrapper } = mountUnderAdmin(dataProvider, () => editLive());
    await flushPromises();

    await input(wrapper).setValue("typed");
    await rename(dataProvider, 1, "a2");
    await flushPromises();

    expect(value(wrapper)).toBe("typed");
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it("applies the held change once the form is saved or reset", async () => {
    const reset = setup();
    const getOneOnReset = vi.spyOn(reset.dataProvider, "getOne");
    const resetting = mountUnderAdmin(reset.dataProvider, () => editLive());
    await flushPromises();
    await input(resetting.wrapper).setValue("typed");
    await rename(reset.dataProvider, 1, "a2");
    await flushPromises();
    expect(getOneOnReset).toHaveBeenCalledTimes(1);

    await resetting.wrapper.find('[data-testid="reset"]').trigger("click");
    await flushPromises();
    expect(value(resetting.wrapper)).toBe("a2");
    expect(getOneOnReset).toHaveBeenCalledTimes(2);

    const save = setup();
    const getOneOnSave = vi.spyOn(save.dataProvider, "getOne");
    const saving = mountUnderAdmin(save.dataProvider, () => editLive());
    await flushPromises();
    await input(saving.wrapper).setValue("typed");
    await rename(save.dataProvider, 1, "a2");
    await flushPromises();
    expect(getOneOnSave).toHaveBeenCalledTimes(1);

    await saving.wrapper.find('[data-slot="save-button"]').trigger("click");
    await flushPromises();
    expect(value(saving.wrapper)).toBe("typed");
    // The save's own refetch, plus the one the held event runs once clean.
    expect(getOneOnSave).toHaveBeenCalledTimes(3);
  });

  it("keeps listening to the record the form was opened on when the route id changes", async () => {
    const { dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const router = makeRouter();
    await router.push("/posts/1");
    const { wrapper } = mountUnderAdmin(
      dataProvider,
      () =>
        h(
          EditLive,
          { resource: "posts", redirectOnSave: false },
          { default: fields, toolbar },
        ),
      router,
    );
    await flushPromises();
    expect(value(wrapper)).toBe("a");

    // <Edit> reads its id once, so the form stays on record 1.
    await router.push("/posts/2");
    await flushPromises();
    await rename(dataProvider, 2, "b2");
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);

    await rename(dataProvider, 1, "a2");
    await flushPromises();
    expect(value(wrapper)).toBe("a2");
  });

  it("ignores events of other records", async () => {
    const { dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const { wrapper } = mountUnderAdmin(dataProvider, () => editLive());
    await flushPromises();

    await rename(dataProvider, 2, "b2");
    await flushPromises();

    expect(value(wrapper)).toBe("a");
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it("hears an event that lands before the record has loaded", async () => {
    const { dataProvider } = setup();
    // The form mounts only once the record is there, so a subscription made
    // inside it would never hear an event while the first load has failed.
    vi.spyOn(dataProvider, "getOne").mockRejectedValueOnce(new Error("down"));
    const { wrapper } = mountUnderAdmin(dataProvider, () => editLive());
    await flushPromises();
    expect(input(wrapper).exists()).toBe(false);

    await rename(dataProvider, 1, "a2");
    await flushPromises();

    expect(value(wrapper)).toBe("a2");
  });

  it("stops listening on unmount", async () => {
    const { transport, dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const { wrapper } = mountUnderAdmin(dataProvider, () => editLive());
    await flushPromises();

    wrapper.unmount();
    await rename(dataProvider, 1, "a2");
    transport.simulateReconnect();
    await flushPromises();

    expect(getOne).toHaveBeenCalledTimes(1);
  });
});
