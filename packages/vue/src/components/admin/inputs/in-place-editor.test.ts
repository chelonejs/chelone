/**
 * `<InPlaceEditor>`: shows a record value, turns it into an input on click and
 * saves the change with `update`.
 *
 * Each test mounts a `<Show>` route under `<Admin>`, so the record comes from
 * the data provider as it does on a real show page. `update` is a spy on the
 * data provider, and notifications are read off a spy on the store.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type MutationMode,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import {
  type DOMWrapper,
  flushPromises,
  mount,
  type VueWrapper,
} from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import TextField from "../fields/text-field.vue";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import List from "../view/list.vue";
import Show from "../view/show.vue";
import InPlaceEditor from "./in-place-editor.vue";
import TextInput from "./text-input.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const messages = {
  "chelone.action.edit": "Edit",
  "chelone.action.save": "Save",
  "chelone.action.cancel": "Cancel",
};

const seed = () => ({ posts: [{ id: 1, title: "Alpha", views: 10 }] });

/** A promise the test settles by hand, to hold an `update` in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const authWith = (canAccess: AuthProvider["canAccess"]): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  canAccess,
});

const defaultEditor = () => h(InPlaceEditor, { source: "title" });

async function mountEditor({
  editor = defaultEditor,
  inList,
  seedData = seed(),
  gate,
  fail,
  authProvider,
}: {
  editor?: () => VNodeChild;
  /** Mounts a `<DataTable>` list whose row click opens the show page, instead of a `<Show>`. */
  inList?: boolean;
  seedData?: ReturnType<typeof seed>;
  /** Holds `update` until this settles. */
  gate?: Promise<void>;
  /** Rejects `update` with this. */
  fail?: Error;
  authProvider?: AuthProvider;
} = {}) {
  const base = fakeDataProvider(seedData);
  // The fake updates its stored row in place, which a record the page holds can alias, so the arguments are read as they were at call time.
  const updates: Array<Parameters<DataProvider["update"]>[1]> = [];
  const dataProvider: DataProvider = {
    ...base,
    update: vi.fn(async (resource, params) => {
      updates.push(structuredClone(params));
      await gate;
      if (fail) throw fail;
      return base.update(resource, params);
    }),
  };
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(inList ? "/posts" : "/");
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          queryClient: new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          }),
          notifications,
          i18n: createI18n({
            locale: "en",
            messages: { en: defineMessages(messages) },
          }),
        },
        {
          default: () =>
            inList
              ? h(Resource, {
                  name: "posts",
                  list: defineComponent({
                    setup: () => () =>
                      h(
                        List,
                        { resource: "posts" },
                        {
                          default: () =>
                            h(
                              DataTable,
                              { rowClick: "show" },
                              {
                                default: () => [
                                  h(DataTableCol, { source: "id" }),
                                  h(
                                    DataTableCol,
                                    { label: "Title" },
                                    { default: editor },
                                  ),
                                ],
                              },
                            ),
                        },
                      ),
                  }),
                  show: defineComponent({
                    setup: () => () => h("div", { "data-slot": "show-page" }),
                  }),
                })
              : h(
                  Show,
                  { resource: "posts", id: 1, title: "" },
                  { default: editor },
                ),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, dataProvider, notify, updates };
}

type Page = Awaited<ReturnType<typeof mountEditor>>;

const readingSelector = '[data-slot="in-place-editor-reading"]';
const savingSelector = '[data-slot="in-place-editor-saving"]';

/** Waits for `find` to return a match, flushing between tries. */
async function until<T extends Element>(
  find: () => DOMWrapper<T>,
): Promise<DOMWrapper<T>> {
  await vi.waitFor(async () => {
    await flushPromises();
    expect(find().exists()).toBe(true);
  });
  return find();
}

const findReading = (page: Page) =>
  until(() => page.wrapper.find(readingSelector));
const findSaving = (page: Page) =>
  until(() => page.wrapper.find(savingSelector));
const findInput = (page: Page) =>
  until(() => page.wrapper.find<HTMLInputElement>("input"));

const inputValue = (input: DOMWrapper<HTMLInputElement>) =>
  elementOf(input.element, HTMLInputElement).value;

/**
 * Types `value` into the input and submits its form. jsdom has no implicit
 * submission, so the Enter a user presses is the form's `submit` here.
 */
async function changeAndSubmit(
  input: DOMWrapper<HTMLInputElement>,
  value: string,
) {
  await input.setValue(value);
  await submit(input);
}

async function submit(input: DOMWrapper<Element>) {
  const form = input.element.closest("form");
  if (!form) throw new Error("the input is not in a form");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flushPromises();
}

/** Starts editing and returns the input, once it is on screen. */
async function startEditing(page: Page) {
  await (await findReading(page)).trigger("click");
  return findInput(page);
}

const buttonNamed = (page: Page, name: string) =>
  page.wrapper.find(`button[aria-label="${name}"]`);

describe("<InPlaceEditor>", () => {
  it("shows the record value as a button labelled Edit", async () => {
    const page = await mountEditor();

    const reading = await findReading(page);

    expect(reading.text()).toBe("Alpha");
    expect(reading.attributes("role")).toBe("button");
    expect(reading.attributes("aria-label")).toBe("Edit");
    expect(reading.attributes("tabindex")).toBe("0");
    expect(reading.element.closest('[data-slot="in-place-editor"]')).not.toBe(
      null,
    );
  });

  it("a click or Enter swaps in the input holding the current value", async () => {
    const page = await mountEditor();

    const afterClick = await startEditing(page);
    expect(inputValue(afterClick)).toBe("Alpha");
    expect(afterClick.element.closest("form")?.dataset.slot).toBe(
      "in-place-editor-editing",
    );
    expect(page.wrapper.find(readingSelector).exists()).toBe(false);

    await afterClick.trigger("keydown", { key: "Escape" });
    await (await findReading(page)).trigger("keydown", { key: "Enter" });
    expect(inputValue(await findInput(page))).toBe("Alpha");

    await (await findInput(page)).trigger("keydown", { key: "Escape" });
    await (await findReading(page)).trigger("keydown", { key: " " });
    expect(inputValue(await findInput(page))).toBe("Alpha");
  });

  it("focuses the input when editing starts", async () => {
    const page = await mountEditor();

    const input = await startEditing(page);

    expect(document.activeElement).toBe(input.element);
  });

  it("Enter after a change calls update with only the changed field and the record as previousData", async () => {
    const page = await mountEditor();

    await changeAndSubmit(await startEditing(page), "Beta");

    await vi.waitFor(() =>
      expect(page.dataProvider.update).toHaveBeenCalledTimes(1),
    );
    expect(page.updates).toEqual([
      {
        id: 1,
        data: { title: "Beta" },
        previousData: { id: 1, title: "Alpha", views: 10 },
      },
    ]);
    expect((await findReading(page)).text()).toBe("Beta");
  });

  it("sends meta with the update", async () => {
    const page = await mountEditor({
      editor: () =>
        h(InPlaceEditor, { source: "title", meta: { reason: "typo" } }),
    });

    await changeAndSubmit(await startEditing(page), "Beta");

    await vi.waitFor(() =>
      expect(page.dataProvider.update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ meta: { reason: "typo" } }),
      ),
    );
  });

  it("Enter with no change calls nothing and returns to reading", async () => {
    const page = await mountEditor();

    await submit(await startEditing(page));

    expect((await findReading(page)).text()).toBe("Alpha");
    expect(page.wrapper.find("input").exists()).toBe(false);
    expect(page.dataProvider.update).not.toHaveBeenCalled();
  });

  it("Escape cancels and calls nothing", async () => {
    const page = await mountEditor();
    const input = await startEditing(page);
    await input.setValue("Beta");

    await input.trigger("keydown", { key: "Escape" });

    expect((await findReading(page)).text()).toBe("Alpha");
    expect(page.dataProvider.update).not.toHaveBeenCalled();
  });

  it("a blur cancels by default and submits with cancelOnBlur false", async () => {
    const first = await mountEditor();
    const input = await startEditing(first);
    await input.setValue("Beta");

    await input.trigger("focusout", { relatedTarget: null });

    expect((await findReading(first)).text()).toBe("Alpha");
    expect(first.dataProvider.update).not.toHaveBeenCalled();
    for (const wrapper of mounted.splice(0)) wrapper.unmount();

    const second = await mountEditor({
      editor: () => h(InPlaceEditor, { source: "title", cancelOnBlur: false }),
    });
    const again = await startEditing(second);
    await again.setValue("Beta");

    await again.trigger("focusout", { relatedTarget: document.body });

    await vi.waitFor(() =>
      expect(second.dataProvider.update).toHaveBeenCalledTimes(1),
    );
    expect((await findReading(second)).text()).toBe("Beta");
  });

  it("a blur onto another element inside the editor does nothing", async () => {
    const page = await mountEditor({
      editor: () => h(InPlaceEditor, { source: "title", showButtons: true }),
    });
    const input = await startEditing(page);
    await input.setValue("Beta");

    await input.trigger("focusout", {
      relatedTarget: buttonNamed(page, "Save").element,
    });

    expect(inputValue(await findInput(page))).toBe("Beta");
    expect(page.dataProvider.update).not.toHaveBeenCalled();
  });

  it("showButtons saves with the Save button and cancels with the Cancel button", async () => {
    const page = await mountEditor({
      editor: () => h(InPlaceEditor, { source: "title", showButtons: true }),
    });
    const input = await startEditing(page);
    await input.setValue("Beta");

    await buttonNamed(page, "Save").trigger("click");

    await vi.waitFor(() =>
      expect(page.dataProvider.update).toHaveBeenCalledTimes(1),
    );
    expect((await findReading(page)).text()).toBe("Beta");

    const second = await startEditing(page);
    await second.setValue("Gamma");
    await buttonNamed(page, "Cancel").trigger("click");

    expect((await findReading(page)).text()).toBe("Beta");
    expect(page.dataProvider.update).toHaveBeenCalledTimes(1);
  });

  it("shows no buttons by default", async () => {
    const page = await mountEditor();
    await startEditing(page);

    expect(buttonNamed(page, "Save").exists()).toBe(false);
    expect(buttonNamed(page, "Cancel").exists()).toBe(false);
  });

  it("shows the new value as busy until a pessimistic update answers", async () => {
    const pending = deferred<void>();
    const page = await mountEditor({ gate: pending.promise });

    await changeAndSubmit(await startEditing(page), "Beta");

    const saving = await findSaving(page);
    expect(saving.attributes("aria-busy")).toBe("true");
    expect(saving.text()).toBe("Beta");
    expect(page.wrapper.find("input").exists()).toBe(false);
    expect(page.wrapper.find(readingSelector).exists()).toBe(false);
    expect(page.dataProvider.update).toHaveBeenCalledTimes(1);

    pending.resolve();
    await flushPromises();

    expect((await findReading(page)).text()).toBe("Beta");
    expect(page.wrapper.find(savingSelector).exists()).toBe(false);
  });

  it("a rejected update returns to the old value, notifies an error and emits error", async () => {
    const failure = new Error("server down");
    const onError = vi.fn();
    const page = await mountEditor({
      editor: () => h(InPlaceEditor, { source: "title", onError }),
      fail: failure,
    });

    await changeAndSubmit(await startEditing(page), "Beta");

    expect((await findReading(page)).text()).toBe("Alpha");
    expect(page.notify).toHaveBeenCalledWith(
      "chelone.notification.http_error",
      { type: "error" },
    );
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("notifyOnSuccess notifies once, and a success emits success", async () => {
    const onSuccess = vi.fn();
    const page = await mountEditor({
      editor: () =>
        h(InPlaceEditor, { source: "title", notifyOnSuccess: true, onSuccess }),
    });

    await changeAndSubmit(await startEditing(page), "Beta");

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, title: "Beta", views: 10 });
    const updated = page.notify.mock.calls.filter(
      ([message]) => message === "chelone.notification.updated",
    );
    expect(updated).toEqual([
      [
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ],
    ]);
  });

  it("notifies nothing on success by default", async () => {
    const page = await mountEditor();

    await changeAndSubmit(await startEditing(page), "Beta");

    expect((await findReading(page)).text()).toBe("Beta");
    expect(page.notify).not.toHaveBeenCalled();
  });

  it("an undoable update notifies once, with Undo, whatever notifyOnSuccess says", async () => {
    const page = await mountEditor({
      editor: () =>
        h(InPlaceEditor, {
          source: "title",
          mutationMode: "undoable",
          notifyOnSuccess: true,
        }),
    });

    await changeAndSubmit(await startEditing(page), "Beta");

    expect((await findReading(page)).text()).toBe("Beta");
    expect(
      page.notify.mock.calls.filter(
        ([message]) => message === "chelone.notification.updated",
      ),
    ).toEqual([
      [
        "chelone.notification.updated",
        expect.objectContaining({ undoable: true }),
      ],
    ]);
  });

  it("a failed undoable update notifies one error and emits error", async () => {
    const failure = new Error("server down");
    const onError = vi.fn();
    const page = await mountEditor({
      editor: () =>
        h(InPlaceEditor, {
          source: "title",
          mutationMode: "undoable",
          onError,
        }),
      fail: failure,
    });

    await changeAndSubmit(await startEditing(page), "Beta");
    await vi.waitFor(() => expect(page.notify).toHaveBeenCalledTimes(1));
    // Closing the Undo notification is what sends the deferred update.
    const [, options] = page.notify.mock.calls[0] ?? [];
    options?.onClose?.();
    await flushPromises();

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
    expect(
      page.notify.mock.calls.filter(
        ([message]) => message === "chelone.notification.http_error",
      ),
    ).toHaveLength(1);
  });

  it("a mutationMode changed after mount does not change how a failure is notified", async () => {
    const mode = ref<MutationMode | undefined>(undefined);
    const page = await mountEditor({
      editor: () =>
        h(InPlaceEditor, { source: "title", mutationMode: mode.value }),
      fail: new Error("server down"),
    });
    mode.value = "undoable";
    await flushPromises();

    await changeAndSubmit(await startEditing(page), "Beta");

    await vi.waitFor(() =>
      expect(page.notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        { type: "error" },
      ),
    );
    expect((await findReading(page)).text()).toBe("Alpha");
  });

  it("without edit access the value shows and cannot be clicked", async () => {
    const page = await mountEditor({
      authProvider: authWith(async () => false),
    });

    const value = await until(() => page.wrapper.find("span"));
    await value.trigger("click");

    expect(page.wrapper.find(readingSelector).exists()).toBe(false);
    expect(page.wrapper.find("input").exists()).toBe(false);
    expect(value.text()).toBe("Alpha");
  });

  it("while access is pending the value shows and cannot be clicked", async () => {
    const page = await mountEditor({
      authProvider: authWith(() => new Promise<boolean>(() => {})),
    });

    const value = await until(() => page.wrapper.find("span"));
    await value.trigger("click");

    expect(page.wrapper.find(readingSelector).exists()).toBe(false);
    expect(page.wrapper.find("input").exists()).toBe(false);
  });

  it("a click inside a DataTable row does not fire the row click", async () => {
    const page = await mountEditor({ inList: true });

    const input = await startEditing(page);
    await input.trigger("click");

    expect(page.wrapper.find("table").exists()).toBe(true);
    const idCell = page.wrapper
      .findAll("td")
      .find((cell) => cell.text() === "1");
    if (!idCell) throw new Error("no id cell");
    await idCell.trigger("click");
    await until(() => page.wrapper.find('[data-slot="show-page"]'));
    expect(page.wrapper.find("table").exists()).toBe(false);
  });

  it("the default and editor slots replace the default field and input", async () => {
    const page = await mountEditor({
      editor: () =>
        h(
          InPlaceEditor,
          {},
          {
            default: () => h(TextField, { source: "views" }),
            editor: () =>
              h(TextInput, { source: "views", label: false, autofocus: true }),
          },
        ),
    });

    const input = await startEditing(page);
    expect(inputValue(input)).toBe("10");

    await changeAndSubmit(input, "11");

    await vi.waitFor(() =>
      expect(page.dataProvider.update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ data: { views: "11" } }),
      ),
    );
  });

  it("throws an error naming the missing props", () => {
    const quiet = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() => mount(InPlaceEditor)).toThrow(
        /`source`.*`default` slot.*`editor` slot/,
      );
      expect(() =>
        mount(InPlaceEditor, { slots: { default: "text" } }),
      ).toThrow(/`source`.*`editor` slot/);
    } finally {
      quiet.mockRestore();
    }
  });

  it("renders a value that holds markup as text", async () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const pending = deferred<void>();
    const page = await mountEditor({
      seedData: { posts: [{ id: 1, title: img, views: 10 }] },
      gate: pending.promise,
    });
    const noMarkup = () =>
      expect(document.body.querySelector("img, script")).toBeNull();

    const reading = await findReading(page);
    expect(reading.text()).toBe(img);
    noMarkup();

    await reading.trigger("click");
    const input = await findInput(page);
    expect(inputValue(input)).toBe(img);
    noMarkup();

    await changeAndSubmit(input, script);
    const saving = await findSaving(page);
    expect(saving.text()).toBe(script);
    noMarkup();

    pending.resolve();
    await flushPromises();
    expect((await findReading(page)).text()).toBe(script);
    noMarkup();
  });
});
