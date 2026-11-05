/**
 * Tests: the resource-bound buttons throw their own message when rendered
 * under `<Admin>` with no ambient `<Resource>` and no `resource` prop.
 */

import { createStore, defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import BulkDeleteButton from "./bulk-delete-button.vue";
import BulkExportButton from "./bulk-export-button.vue";
import BulkUpdateButton from "./bulk-update-button.vue";
import ColumnsButton from "./columns-button.vue";
import DeleteButton from "./delete-button.vue";
import ExportButton from "./export-button.vue";
import ListButton from "./list-button.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

function mountBare(button: Component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider<typeof resources>({ posts: [] }),
            queryClient: new QueryClient(),
            store: createStore(),
          },
          { default: () => h(button) },
        );
    },
  });
  return mount(Harness, { global: { plugins: [router] } });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resource-bound buttons without a resource", () => {
  it.each([
    ["BulkDeleteButton", BulkDeleteButton],
    ["BulkExportButton", BulkExportButton],
    ["BulkUpdateButton", BulkUpdateButton],
    ["DeleteButton", DeleteButton],
    ["ExportButton", ExportButton],
    ["ListButton", ListButton],
  ])("<%s> throws its own message", (name, button) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mountBare(button)).toThrow(
      `<${name}> must be used inside a <Resource> or given a \`resource\` prop.`,
    );
  });

  it("<ColumnsButton> throws its own message without a resource or storeKey", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mountBare(ColumnsButton)).toThrow(
      "ColumnsButton: no resource. Pass a `resource` or `storeKey` prop or render inside a <Resource>.",
    );
  });
});
