/**
 * `<PermissionMatrix>` tests: a tab per role over a resource by action grid of
 * checkboxes, the Vue twin of `@chelone/react`'s `auth/permission-matrix.tsx`.
 * Mounted under `<Admin>`; asserts DOM, roles and the emitted `v-model`.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type PermissionMatrixValue,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import PermissionMatrix, {
  type PermissionMatrixProps,
} from "./permission-matrix.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

function mountMatrix(
  props: PermissionMatrixProps,
  messages: Record<string, string> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient({
                defaultOptions: { queries: { retry: false } },
              }),
              i18n: createI18n({
                locale: "en",
                messages: { en: defineMessages(messages) },
              }),
            },
            { default: () => h(PermissionMatrix, props) },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
}

/** The emitted values of the matrix inside the `<Admin>` shell. */
function emitted(wrapper: VueWrapper): PermissionMatrixValue[] {
  const events = wrapper
    .findComponent(PermissionMatrix)
    .emitted<[PermissionMatrixValue]>("update:modelValue");
  return (events ?? []).map(([next]) => next);
}

function cell(wrapper: VueWrapper, name: string) {
  return wrapper.get<HTMLInputElement>(`[data-cell="${name}"]`);
}

function all(wrapper: VueWrapper, name: string) {
  return wrapper.get<HTMLInputElement>(`[data-all="${name}"]`);
}

const modelValue: PermissionMatrixValue = {
  admin: [{ resource: "posts", action: ["list", "show"] }],
  editor: [{ resource: "comments", action: "list" }],
};

describe("<PermissionMatrix>", () => {
  it("renders a tab per role with the first one active", () => {
    const wrapper = mountMatrix({
      roles: ["admin", { id: "editor", label: "Editor role" }],
      resources: ["posts"],
    });
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text())).toEqual(["admin", "Editor role"]);
    expect(tabs[0]?.attributes("aria-selected")).toBe("true");
    expect(tabs[1]?.attributes("aria-selected")).toBe("false");
    expect(wrapper.find('[data-slot="permission-matrix"]').exists()).toBe(true);
  });

  it("renders a row per resource and a column per action, with translated action headers", () => {
    const wrapper = mountMatrix(
      {
        roles: ["admin"],
        resources: ["posts", { id: "comments", label: "Remarks" }],
        actions: ["list", "publish"],
      },
      { "chelone.action.list": "Browse" },
    );
    expect(wrapper.findAll("th").map((header) => header.text())).toEqual([
      "Resource",
      "Browse",
      "Publish",
      "All",
    ]);
    const rows = wrapper.findAll("[data-resource]");
    expect(rows.map((row) => row.attributes("data-resource"))).toEqual([
      "posts",
      "comments",
    ]);
    expect(rows.map((row) => row.get("td").text())).toEqual([
      "Posts",
      "Remarks",
    ]);
  });

  it("checks the cells the model value grants", () => {
    const wrapper = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      modelValue,
    });
    expect(cell(wrapper, "admin.posts.list").element.checked).toBe(true);
    expect(cell(wrapper, "admin.posts.show").element.checked).toBe(true);
    expect(cell(wrapper, "admin.posts.edit").element.checked).toBe(false);
    expect(cell(wrapper, "admin.posts.list").attributes("aria-label")).toBe(
      "admin List Posts",
    );
  });

  it("clicking a denied cell emits update:modelValue with the action added", async () => {
    const wrapper = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      modelValue,
    });
    await cell(wrapper, "admin.posts.edit").setValue(true);
    expect(emitted(wrapper)).toEqual([
      {
        ...modelValue,
        admin: [{ resource: "posts", action: ["list", "show", "edit"] }],
      },
    ]);
  });

  it("clicking a granted cell emits update:modelValue with the action removed", async () => {
    const wrapper = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      modelValue,
    });
    await cell(wrapper, "admin.posts.list").setValue(false);
    expect(emitted(wrapper)).toEqual([
      { ...modelValue, admin: [{ resource: "posts", action: ["show"] }] },
    ]);
  });

  it("a cell granted by a wildcard is checked, disabled and marked inherited", async () => {
    const wrapper = mountMatrix(
      {
        roles: ["root"],
        resources: ["posts"],
        modelValue: { root: [{ resource: "*", action: "*" }] },
      },
      { "chelone.permission_matrix.inherited": "From a wildcard" },
    );
    const inherited = cell(wrapper, "root.posts.list");
    expect(inherited.element.checked).toBe(true);
    expect(inherited.element.disabled).toBe(true);
    expect(inherited.attributes("data-inherited")).toBeDefined();
    expect(inherited.attributes("title")).toBe("From a wildcard");
    await inherited.trigger("change");
    expect(emitted(wrapper)).toEqual([]);
    expect(all(wrapper, "root.posts").element.disabled).toBe(true);
  });

  it("the All checkbox grants every action of the row, and clears them when all are granted", async () => {
    const partial = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      actions: ["list", "show"],
      modelValue: { admin: [{ resource: "posts", action: "list" }] },
    });
    expect(all(partial, "admin.posts").element.checked).toBe(false);
    await all(partial, "admin.posts").setValue(true);
    expect(emitted(partial)).toEqual([
      { admin: [{ resource: "posts", action: ["list", "show"] }] },
    ]);

    const full = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      actions: ["list", "show"],
      modelValue: {
        admin: [{ resource: "posts", action: ["list", "show"] }],
      },
    });
    expect(all(full, "admin.posts").element.checked).toBe(true);
    await all(full, "admin.posts").setValue(false);
    expect(emitted(full)).toEqual([{ admin: [] }]);
  });

  it("an All checkbox whose click changes nothing keeps showing the model", async () => {
    const wrapper = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      actions: [],
    });
    expect(all(wrapper, "admin.posts").element.checked).toBe(true);
    await all(wrapper, "admin.posts").setValue(false);
    expect(emitted(wrapper)).toEqual([]);
    expect(all(wrapper, "admin.posts").element.checked).toBe(true);
  });

  it("switching tabs shows the other role's grants", async () => {
    const wrapper = mountMatrix({
      roles: ["admin", "editor"],
      resources: ["comments"],
      modelValue,
    });
    expect(wrapper.find('[data-cell="editor.comments.list"]').exists()).toBe(
      false,
    );
    await wrapper.get('[role="tab"][id$="trigger-editor"]').trigger("click");
    expect(cell(wrapper, "editor.comments.list").element.checked).toBe(true);
    expect(wrapper.find('[data-cell="admin.comments.list"]').exists()).toBe(
      false,
    );
  });

  it("readOnly disables every checkbox and emits nothing", async () => {
    const wrapper = mountMatrix({
      roles: ["admin"],
      resources: ["posts"],
      modelValue,
      readOnly: true,
    });
    const boxes = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]');
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) expect(box.element.disabled).toBe(true);
    await cell(wrapper, "admin.posts.edit").trigger("change");
    await all(wrapper, "admin.posts").trigger("change");
    expect(emitted(wrapper)).toEqual([]);
  });

  it("shows the empty text when there are no roles", () => {
    const wrapper = mountMatrix(
      { roles: [], resources: ["posts"] },
      { "chelone.permission_matrix.no_roles": "Nothing here" },
    );
    expect(wrapper.get('[data-slot="permission-matrix-empty"]').text()).toBe(
      "Nothing here",
    );
    expect(wrapper.find('[role="tab"]').exists()).toBe(false);
  });

  it("renders role and resource labels that hold markup as text", () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const wrapper = mountMatrix({
      roles: [{ id: "admin", label: img }],
      resources: [{ id: "posts", label: script }],
    });
    expect(wrapper.get('[role="tab"]').text()).toBe(img);
    expect(wrapper.get('[data-resource="posts"] td').text()).toBe(script);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(cell(wrapper, "admin.posts.list").attributes("aria-label")).toBe(
      `${img} List ${script}`,
    );
  });
});
