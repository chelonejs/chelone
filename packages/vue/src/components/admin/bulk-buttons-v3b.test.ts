/**
 * V3-b Task 3 gate probes for the bulk / export button surface:
 * `<BulkDeleteButton>` deletes the selected rows (through a stubbed confirm) +
 * clears the selection; `<BulkUpdateButton>` patches the selected rows + clears
 * the selection; `<BulkExportButton>` fetches the selected rows via `getMany`
 * and runs the exporter; `<ExportButton>` fetches the filtered/sorted page via
 * `getList` and is disabled on an empty list. Mounted under a real `<Admin>` +
 * `<List>` (the Task-5 controller harness) so the ambient `ListContext` is live.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { type ListContextValue, useListContext } from "../../list/list-context";
import BulkDeleteButton from "./buttons/bulk-delete-button.vue";
import BulkExportButton from "./buttons/bulk-export-button.vue";
import BulkUpdateButton from "./buttons/bulk-update-button.vue";
import ExportButton from "./buttons/export-button.vue";
import List from "./view/list.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Resources = typeof resources;
interface Post {
  id: number;
  title: string;
  views: number;
}

const seed: Post[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
  views: 0,
}));

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

function mountAdmin(render: () => VNodeChild, router: Router = makeRouter()) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider, queryClient, router };
}

const listProbe = (capture: { list?: ListContextValue }) =>
  defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });

const settled = (capture: { list?: ListContextValue }) =>
  vi.waitFor(() => expect(capture.list?.isPending).toBe(false));

// `<BulkUpdateButton>` still gates on the V3-b `window.confirm(...)` placeholder
// (only Delete/BulkDelete were upgraded to `<Confirm>` in V3-c) — jsdom does not
// implement `window.confirm`, so stub it for that button's specs.
let confirmSpy: MockInstance<typeof window.confirm>;
beforeEach(() => {
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  confirmSpy.mockRestore();
});

describe("<BulkDeleteButton>", () => {
  it("opens the <Confirm> dialog then deletes on confirm + clears the selection", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(BulkDeleteButton, { resource: "posts" }),
          ],
        },
      ),
    );
    await settled(capture);
    const deleteManySpy = vi.spyOn(dataProvider, "deleteMany");
    capture.list?.select([1, 3]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 3]));

    // Click opens the dialog — no delete yet.
    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");
    expect(wrapper.find('[data-slot="confirm"]').exists()).toBe(true);
    expect(deleteManySpy).not.toHaveBeenCalled();

    await wrapper.find('[data-slot="confirm-accept"]').trigger("click");
    await vi.waitFor(() => expect(deleteManySpy).toHaveBeenCalledTimes(1));
    expect(deleteManySpy.mock.calls[0]![0]).toBe("posts");
    expect(deleteManySpy.mock.calls[0]![1]).toMatchObject({ ids: [1, 3] });
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([]));
  });

  it("does nothing when the dialog is cancelled", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(BulkDeleteButton, { resource: "posts" }),
          ],
        },
      ),
    );
    await settled(capture);
    const deleteManySpy = vi.spyOn(dataProvider, "deleteMany");
    capture.list?.select([1]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1]));

    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");
    await wrapper.find('[data-slot="confirm-cancel"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(deleteManySpy).not.toHaveBeenCalled();
    expect(wrapper.find('[data-slot="confirm"]').exists()).toBe(false);
  });

  it("does nothing when no rows are selected", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(BulkDeleteButton, { resource: "posts" }),
          ],
        },
      ),
    );
    await settled(capture);
    const deleteManySpy = vi.spyOn(dataProvider, "deleteMany");

    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(deleteManySpy).not.toHaveBeenCalled();
  });
});

describe("<BulkUpdateButton>", () => {
  it("patches the selected rows with the data payload and clears the selection", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(BulkUpdateButton, { resource: "posts", data: { views: 0 } }),
          ],
        },
      ),
    );
    await settled(capture);
    const updateManySpy = vi.spyOn(dataProvider, "updateMany");
    capture.list?.select([2, 4]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([2, 4]));

    await wrapper.find('[data-slot="bulk-update-button"]').trigger("click");

    await vi.waitFor(() => expect(updateManySpy).toHaveBeenCalledTimes(1));
    expect(updateManySpy.mock.calls[0]![0]).toBe("posts");
    expect(updateManySpy.mock.calls[0]![1]).toMatchObject({
      ids: [2, 4],
      data: { views: 0 },
    });
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([]));
  });
});

describe("<BulkExportButton>", () => {
  it("fetches the selected rows via getMany and runs the exporter", async () => {
    const capture: { list?: ListContextValue } = {};
    const exporter = vi.fn();
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(BulkExportButton, { resource: "posts", exporter }),
          ],
        },
      ),
    );
    await settled(capture);
    const getManySpy = vi.spyOn(dataProvider, "getMany");
    capture.list?.select([1, 2]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 2]));

    await wrapper.find('[data-slot="bulk-export-button"]').trigger("click");

    await vi.waitFor(() => expect(getManySpy).toHaveBeenCalledTimes(1));
    expect(getManySpy.mock.calls[0]![1]).toMatchObject({ ids: [1, 2] });
    await vi.waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    expect(exporter.mock.calls[0]![0]).toHaveLength(2);
  });
});

describe("<ExportButton>", () => {
  it("fetches the filtered/sorted list via getList and runs the exporter", async () => {
    const capture: { list?: ListContextValue } = {};
    const exporter = vi.fn();
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(ExportButton, { resource: "posts", exporter }),
          ],
        },
      ),
    );
    await settled(capture);
    const getListSpy = vi.spyOn(dataProvider, "getList");

    await wrapper.find('[data-slot="export-button"]').trigger("click");

    await vi.waitFor(() => expect(getListSpy).toHaveBeenCalledTimes(1));
    expect(getListSpy.mock.calls[0]![1]).toMatchObject({
      pagination: { page: 1, perPage: 1000 },
    });
    await vi.waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    expect(exporter.mock.calls[0]![0]).toHaveLength(5);
  });

  it("is disabled when the list is empty", async () => {
    const capture: { list?: ListContextValue } = {};
    const dataProvider = fakeDataProvider<Resources>({ posts: [] });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider, queryClient },
            {
              default: () =>
                h(
                  List,
                  { resource: "posts" },
                  {
                    default: () => [
                      h(listProbe(capture)),
                      h(ExportButton, { resource: "posts" }),
                    ],
                  },
                ),
            },
          );
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [makeRouter()] } });
    await settled(capture);

    const button = wrapper.find('[data-slot="export-button"]');
    await vi.waitFor(() => expect(button.attributes("disabled")).toBeDefined());
  });
});
