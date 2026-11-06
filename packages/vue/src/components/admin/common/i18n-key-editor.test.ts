/**
 * Tests: `<I18nKeyEditor>` — the panel listing the keys the current locale
 * missed, with an input per key and an export of the typed translations.
 *
 * Mounted as the `#layout` of a real `<Admin>` with a real `createI18n` wired to
 * a real `createMissingKeyStore` through `onMissingKey`. Asserts DOM, roles, the
 * clipboard write and the notification queue.
 */

import {
  createI18n,
  createMissingKeyStore,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type MissingKeyStore,
} from "@chelone/core";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useTranslate } from "../../../i18n/use-translate";
import I18nKeyEditor, { type I18nKeyEditorProps } from "./i18n-key-editor.vue";

const Label = defineComponent({
  props: { k: { type: String, required: true }, fallback: String },
  setup(props) {
    const translate = useTranslate();
    return () =>
      h(
        "p",
        translate(
          props.k,
          props.fallback === undefined ? {} : { _: props.fallback },
        ),
      );
  },
});

let wrapper: VueWrapper | undefined;

function setup({
  label,
  editor,
  store = createMissingKeyStore(),
}: {
  label?: { k: string; fallback?: string };
  editor?: Omit<I18nKeyEditorProps, "store">;
  store?: MissingKeyStore;
} = {}) {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({ "posts.title": "Posts" }),
      fr: defineMessages({}),
    },
    onMissingKey: store.record,
  });
  const notifications = createNotificationStore();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const view = mount(Admin, {
    props: { dataProvider: fakeDataProvider({}), i18n, notifications },
    slots: {
      layout: () => [
        label ? h(Label, label) : null,
        h(I18nKeyEditor, { store, ...editor }),
      ],
    },
    global: { plugins: [router] },
  });
  wrapper = view;
  return { view, store, i18n, notifications };
}

/** The store notifies on a microtask: let it and Vue settle. */
const settle = () => flushPromises();

const ENTRY = '[data-slot="i18n-key-editor-entry"]';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const button = (view: VueWrapper, name: string) =>
  view.findAll("button").find((candidate) => candidate.text() === name);

const entryInput = (view: VueWrapper, key: string) =>
  view.find(`input[aria-label="${key.replaceAll('"', '\\"')}"]`);

describe("<I18nKeyEditor>", () => {
  it("lists a key a component translated with a _ fallback that the catalog lacks", async () => {
    const { view } = setup({
      label: { k: "posts.subtitle", fallback: "Subtitle" },
    });
    await settle();
    expect(view.findAll(ENTRY)).toHaveLength(1);
    expect(view.get(ENTRY).text()).toContain("posts.subtitle");
    expect(view.text()).toContain("Missing keys (1)");
  });

  it("does not list a key the catalog holds", async () => {
    const { view } = setup({ label: { k: "posts.title", fallback: "Posts" } });
    await settle();
    expect(view.findAll(ENTRY)).toHaveLength(0);
    expect(view.text()).toContain("No missing keys yet");
  });

  it("does not list its own labels", async () => {
    const { view } = setup();
    await settle();
    expect(view.findAll(ENTRY)).toHaveLength(0);
    expect(view.text()).toContain("Missing keys (0)");
  });

  it("switching the locale lists that locale's missing keys", async () => {
    const { view, i18n } = setup({
      label: { k: "posts.subtitle", fallback: "Subtitle" },
    });
    await settle();
    expect(entryInput(view, "posts.subtitle").exists()).toBe(true);
    i18n.setLocale("fr");
    await settle();
    // Label re-rendered in fr and recorded the key there; the en list is gone
    expect(view.findAll(ENTRY)).toHaveLength(1);
    expect(entryInput(view, "posts.subtitle").exists()).toBe(true);
  });

  it("switching to a locale with no misses shows the empty state", async () => {
    const store = createMissingKeyStore();
    store.record("only.en", "en", undefined);
    const { view, i18n } = setup({ store });
    await settle();
    expect(entryInput(view, "only.en").exists()).toBe(true);
    i18n.setLocale("fr");
    await settle();
    expect(view.text()).toContain("No missing keys yet");
  });

  it("the input placeholder is the _ fallback", async () => {
    const { view } = setup({
      label: { k: "posts.subtitle", fallback: "Subtitle" },
    });
    await settle();
    expect(entryInput(view, "posts.subtitle").attributes("placeholder")).toBe(
      "Subtitle",
    );
  });

  it("has no placeholder for a key without a fallback", async () => {
    const { view } = setup({ label: { k: "posts.bare" } });
    await settle();
    expect(
      entryInput(view, "posts.bare").attributes("placeholder"),
    ).toBeUndefined();
  });

  it("typing stores the translation in the input", async () => {
    const { view, store } = setup({
      label: { k: "posts.subtitle", fallback: "Subtitle" },
    });
    await settle();
    await entryInput(view, "posts.subtitle").setValue("Sous-titre");
    await settle();
    expect(store.getEntries("en")[0]?.translation).toBe("Sous-titre");
    const typed = entryInput(view, "posts.subtitle").element;
    expect(typed instanceof HTMLInputElement && typed.value).toBe("Sous-titre");
  });

  it("export copies the typed translations as JSON and shows Copied", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { view } = setup({
      label: { k: "posts.subtitle", fallback: "Subtitle" },
    });
    await settle();
    await entryInput(view, "posts.subtitle").setValue("Sous-titre");
    await settle();
    await button(view, "Export")?.trigger("click");
    await settle();
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ "posts.subtitle": "Sous-titre" }, null, 2),
    );
    expect(button(view, "Copied")).toBeDefined();
    vi.advanceTimersByTime(1500);
    await settle();
    expect(button(view, "Export")).toBeDefined();
  });

  it("a rejected clipboard write notifies an error", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { view, notifications } = setup();
    await button(view, "Export")?.trigger("click");
    await settle();
    expect(notifications.getSnapshot()).toMatchObject([
      { message: "Could not copy the translations", type: "error" },
    ]);
    expect(button(view, "Copied")).toBeUndefined();
  });

  it("defaultOpen false starts hidden and the toggle shows the list", async () => {
    const { view } = setup({
      label: { k: "posts.subtitle", fallback: "Subtitle" },
      editor: { defaultOpen: false },
    });
    await settle();
    const root = view.get('[data-slot="i18n-key-editor"]');
    expect(root.attributes("data-open")).toBe("false");
    expect(entryInput(view, "posts.subtitle").exists()).toBe(false);
    const toggle = button(view, "Show");
    expect(toggle?.attributes("aria-expanded")).toBe("false");
    await toggle?.trigger("click");
    expect(root.attributes("data-open")).toBe("true");
    expect(entryInput(view, "posts.subtitle").exists()).toBe(true);
    expect(button(view, "Hide")?.attributes("aria-expanded")).toBe("true");
  });

  it("showExport false hides the export button", async () => {
    const { view } = setup({ editor: { showExport: false } });
    await settle();
    expect(button(view, "Export")).toBeUndefined();
  });

  it("unsubscribes from the store on unmount", async () => {
    const store = createMissingKeyStore();
    const subscribe = store.subscribe;
    const unsubscribed = vi.fn();
    const subscribed = vi.fn();
    vi.spyOn(store, "subscribe").mockImplementation((callback) => {
      subscribed();
      const off = subscribe(callback);
      return () => {
        unsubscribed();
        off();
      };
    });
    const { view } = setup({ store });
    await settle();
    expect(subscribed).toHaveBeenCalled();
    view.unmount();
    wrapper = undefined;
    expect(unsubscribed).toHaveBeenCalledTimes(subscribed.mock.calls.length);
  });

  it("renders a key and a fallback that hold markup as text", async () => {
    const key = "<img src=x onerror=alert(1)>";
    const fallback = "<script>alert(1)</script>";
    const { view } = setup({ label: { k: key, fallback } });
    await settle();
    expect(view.text()).toContain(key);
    expect(entryInput(view, key).attributes("placeholder")).toBe(fallback);
    expect(view.element.querySelector("img")).toBeNull();
    expect(view.element.querySelector("script")).toBeNull();
  });
});
