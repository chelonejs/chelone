/**
 * `<BulkEditDrawer>` — types new values for the selected rows in a side sheet
 * and sends only the touched fields to `updateMany`.
 *
 * Each test mounts a `<List>` with row selection under `<Admin>`. The drawer
 * sits in the list `actions` slot, not the bulk toolbar, so it exists (disabled)
 * before any row is selected. The sheet renders inline, so the wrapper is
 * attached to `document.body` for the Escape listener.
 */

import {
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import NumberInput from "../inputs/number-input.vue";
import TextInput from "../inputs/text-input.vue";
import List from "../view/list.vue";
import BulkEditDrawer, {
  type BulkEditDrawerProps,
} from "./bulk-edit-drawer.vue";
import DataTable from "./data-table.vue";
import DataTableCol from "./data-table-col.vue";

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
});

const seed = () => ({
  posts: [
    { id: 1, title: "Alpha", views: 10 },
    { id: 2, title: "Beta", views: 20 },
    { id: 3, title: "Gamma", views: 30 },
  ],
});

type Messages = Record<string, string | { one?: string; other: string }>;

function mountDrawer({
  dataProvider = fakeDataProvider(seed()),
  messages = {},
  inputs,
  onSuccess,
  ...drawerProps
}: Partial<BulkEditDrawerProps> & {
  dataProvider?: DataProvider;
  inputs?: () => VNodeChild;
  messages?: Messages;
  onSuccess?: (diff: Record<string, unknown>, ids: unknown[]) => void;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider,
            queryClient,
            notifications,
            i18n: createI18n({
              locale: "en",
              messages: { en: defineMessages({ ...messages }) },
            }),
          },
          {
            default: () =>
              h(
                List,
                { resource: "posts" },
                {
                  actions: () =>
                    h(
                      BulkEditDrawer,
                      { ...drawerProps, onSuccess },
                      {
                        default:
                          inputs ??
                          (() => [
                            h(TextInput, { source: "title" }),
                            h(NumberInput, { source: "views" }),
                            h(TextInput, {
                              source: "status",
                              defaultValue: "draft",
                            }),
                          ]),
                      },
                    ),
                  default: () =>
                    h(
                      DataTable,
                      { bulkActions: true },
                      { default: () => [h(DataTableCol, { source: "title" })] },
                    ),
                },
              ),
          },
        );
    },
  });
  const wrapper = mount(Harness, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return { dataProvider, notify, queryClient };
}

/** Ticks the checkbox of each row (by position) once the list has loaded. */
async function selectRows(...positions: number[]) {
  await vi.waitFor(() =>
    expect(document.querySelectorAll('[aria-label="Select row"]')).toHaveLength(
      3,
    ),
  );
  const boxes = document.querySelectorAll<HTMLInputElement>(
    '[aria-label="Select row"]',
  );
  for (const position of positions) {
    const box = boxes[position];
    if (!box) throw new Error(`no row at position ${position}`);
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
  }
  await flushPromises();
}

const trigger = () =>
  document.querySelector<HTMLButtonElement>("[data-bulk-edit-trigger]");
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const buttonNamed = (name: RegExp) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
    name.test(button.textContent ?? ""),
  );

function click(element: Element | null | undefined) {
  if (!element) throw new Error("nothing to click");
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return flushPromises();
}

function inputByLabel(name: RegExp) {
  const label = [...document.querySelectorAll("label")].find((l) =>
    name.test(l.textContent ?? ""),
  );
  const input = label && document.getElementById(label.htmlFor);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`no input labelled ${name}`);
  }
  return input;
}

async function type(name: RegExp, value: string) {
  const input = inputByLabel(name);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
}

async function openSheet() {
  await click(trigger());
  await vi.waitFor(() => expect(dialog()).not.toBeNull());
}

describe("<BulkEditDrawer>", () => {
  it("the trigger is disabled with no selection and shows the count with one", async () => {
    mountDrawer();
    await vi.waitFor(() => expect(trigger()).not.toBeNull());
    expect(trigger()?.disabled).toBe(true);

    await selectRows(0);

    await vi.waitFor(() => expect(trigger()?.disabled).toBe(false));
    expect(trigger()?.textContent).toContain("Edit selected");
    expect(trigger()?.textContent).toContain("1");
  });

  it("applying sends only the touched fields to updateMany for every selected id", async () => {
    const { dataProvider } = mountDrawer();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await selectRows(0, 2);

    await openSheet();
    await type(/title/i, "Renamed");
    await click(buttonNamed(/^apply/i));

    await vi.waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    expect(updateMany).toHaveBeenCalledWith("posts", {
      ids: [1, 3],
      data: { title: "Renamed" },
    });
  });

  it("applying with no touched field closes the sheet without calling updateMany", async () => {
    const { dataProvider, notify } = mountDrawer();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await selectRows(0);

    await openSheet();
    await click(buttonNamed(/^apply/i));

    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(updateMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("success notifies, clears the selection, refreshes the list and emits success with the diff and ids", async () => {
    const onSuccess = vi.fn();
    const { dataProvider, notify } = mountDrawer({ onSuccess });
    const getList = vi.spyOn(dataProvider, "getList");
    await selectRows(0, 1);
    const listCallsBefore = getList.mock.calls.length;

    await openSheet();
    await type(/views/i, "99");
    await click(buttonNamed(/^apply/i));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ views: 99 }, [1, 2]);
    expect(notify).toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.objectContaining({
        type: "info",
        messageArgs: { smart_count: 2 },
      }),
    );
    // Selection cleared: nothing left to edit.
    await vi.waitFor(() => expect(trigger()?.disabled).toBe(true));
    expect(dialog()).toBeNull();
    // List refetched.
    await vi.waitFor(() =>
      expect(getList.mock.calls.length).toBeGreaterThan(listCallsBefore),
    );
    // The rows hold the new value.
    const { data } = await dataProvider.getMany("posts", { ids: [1, 2, 3] });
    expect(data.map((r) => r.views)).toEqual([99, 99, 30]);
  });

  it("a failed updateMany notifies an error and keeps the sheet open with the typed values", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onSuccess = vi.fn();
    const { dataProvider, notify } = mountDrawer({ onSuccess });
    vi.spyOn(dataProvider, "updateMany").mockRejectedValue(new Error("boom"));
    await selectRows(0);

    await openSheet();
    await type(/title/i, "Typed");
    await click(buttonNamed(/^apply/i));

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(dialog()).not.toBeNull();
    expect(inputByLabel(/title/i).value).toBe("Typed");
    expect(onSuccess).not.toHaveBeenCalled();
    // Selection survives so the user can retry.
    expect(trigger()?.disabled).toBe(false);
    consoleError.mockRestore();
  });

  it("disables Apply while updateMany is pending", async () => {
    const { dataProvider } = mountDrawer();
    let release: () => void = () => {};
    vi.spyOn(dataProvider, "updateMany").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: [1] });
        }),
    );
    await selectRows(0);

    await openSheet();
    await type(/title/i, "Slow");
    const apply = buttonNamed(/^apply/i);
    await click(apply);

    await vi.waitFor(() => expect(apply?.disabled).toBe(true));
    release();
    await vi.waitFor(() => expect(dialog()).toBeNull());
  });

  it("cancel resets the form so a reopened sheet starts empty", async () => {
    mountDrawer();
    await selectRows(0);

    await openSheet();
    await type(/title/i, "Discard me");
    await click(buttonNamed(/cancel/i));
    await vi.waitFor(() => expect(dialog()).toBeNull());

    await openSheet();
    expect(inputByLabel(/title/i).value).toBe("");
  });

  it("the description pluralises with the selection size", async () => {
    mountDrawer({
      messages: {
        "chelone.message.bulk_edit_description": {
          one: "Changes {smart_count} record.",
          other: "Changes {smart_count} records.",
        },
      },
    });
    await selectRows(0);
    await openSheet();
    expect(dialog()?.textContent).toContain("Changes 1 record.");
    await click(buttonNamed(/cancel/i));
    await vi.waitFor(() => expect(dialog()).toBeNull());

    await selectRows(1);
    await openSheet();
    expect(dialog()?.textContent).toContain("Changes 2 records.");
  });

  it("Escape and a backdrop click close the sheet", async () => {
    const { dataProvider } = mountDrawer();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await selectRows(0);

    await openSheet();
    await type(/title/i, "Discard me");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await vi.waitFor(() => expect(dialog()).toBeNull());

    // Closing resets the form: the discarded edit is neither shown nor sent.
    await openSheet();
    expect(inputByLabel(/title/i).value).toBe("");
    await click(document.querySelector('[data-slot="sheet-overlay"]'));
    await vi.waitFor(() => expect(dialog()).toBeNull());

    await openSheet();
    await click(buttonNamed(/^apply/i));
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("label, title and side props change the trigger, the heading and the sheet edge", async () => {
    mountDrawer({ label: "Mass edit", title: "Edit many posts", side: "left" });
    await selectRows(0);

    expect(trigger()?.textContent).toContain("Mass edit");
    await openSheet();

    expect(dialog()?.getAttribute("data-side")).toBe("left");
    expect(dialog()?.getAttribute("aria-modal")).toBe("true");
    const heading = dialog()?.querySelector("h2");
    expect(heading?.textContent?.trim()).toBe("Edit many posts");
    expect(dialog()?.getAttribute("aria-labelledby")).toBe(heading?.id);
  });

  it("a nested source is refused with an error instead of overwriting the stored object", async () => {
    const dataProvider = fakeDataProvider({
      posts: [
        { id: 1, title: "Alpha", address: { city: "Paris", zip: "75001" } },
        { id: 2, title: "Beta", address: { city: "Nice", zip: "06000" } },
        { id: 3, title: "Gamma", address: { city: "Lyon", zip: "69001" } },
      ],
    });
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    const { notify } = mountDrawer({
      dataProvider,
      inputs: () => h(TextInput, { source: "address.city" }),
    });
    await selectRows(0, 1);

    await openSheet();
    await type(/city/i, "Lyon");
    await click(buttonNamed(/^apply/i));

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.message.bulk_edit_nested_source",
        expect.objectContaining({
          type: "error",
          messageArgs: expect.objectContaining({ source: "address.city" }),
        }),
      ),
    );
    expect(updateMany).not.toHaveBeenCalled();
    // The sheet stays open with the typed value, and the selection survives.
    expect(inputByLabel(/city/i).value).toBe("Lyon");
    expect(trigger()?.disabled).toBe(false);
  });
});
