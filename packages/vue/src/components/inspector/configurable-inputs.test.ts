/**
 * `<ConfigurableInputs>` mounted the way an app does: an `<Edit>` in the
 * `#layout` slot of a real `<Admin>`, with an `<Inspector>` around it.
 * Assertions are on DOM, roles and the store; jsdom applies no CSS.
 */

import {
  type CheloneStore,
  createI18n,
  createStore,
  fakeDataProvider,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import {
  listCentre,
  mousePointerEvent,
  StubIntersectionObserver,
  stubListDragDom,
} from "@chelone/test-utils/drag-dom";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import TextInput from "../admin/inputs/text-input.vue";
import Edit from "../admin/view/edit.vue";
import ConfigurableInputs from "./configurable-inputs.vue";
import Inspector from "./inspector.vue";
import InspectorButton from "./inspector-button.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
});

interface MountOptions {
  inputs: () => VNodeChild;
  store?: CheloneStore;
}

async function mountPage({ inputs, store = createStore() }: MountOptions) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/");
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({
        posts: [{ id: 1, title: "Alpha", views: 3, author: "Ada" }],
      }),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      store,
      i18n: createI18n({
        locale: "en",
        messages: { en: { "resources.posts.fields.title": "Headline" } },
      }),
    },
    slots: {
      layout: () =>
        h(Inspector, null, {
          default: () =>
            h(Edit, { resource: "posts", id: 1 }, () => [
              h(InspectorButton),
              inputs(),
            ]),
        }),
    },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await vi.waitFor(() => expect(values()).not.toEqual([]));
  return { wrapper, store };
}

const sources = ["title", "views", "author"];
const textInputs = () => sources.map((source) => h(TextInput, { source }));

/** The values of the text inputs on the page, in document order. */
const values = () =>
  Array.from(document.querySelectorAll("input[type=text], input:not([type])"))
    .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement)
    .map((el) => el.value);
const rows = () =>
  Array.from(document.querySelectorAll("[data-slot=fields-selector-row]"));
const rowLabels = () => rows().map((row) => row.textContent?.trim());
const rowFor = (name: string) =>
  defined(rows().find((row) => row.textContent?.trim() === name));
const switchFor = (name: string) =>
  defined(rowFor(name).querySelector<HTMLInputElement>("[role=switch]"));
const moveButton = (name: string, action: "Move up" | "Move down") =>
  defined(rowFor(name).querySelector<HTMLElement>(`[aria-label="${action}"]`));
const buttonNamed = (name: string) =>
  defined(document.querySelector<HTMLElement>(`button[aria-label="${name}"]`));
const click = async (el: Element) => {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushPromises();
};

async function openPanel() {
  await click(buttonNamed("Configure mode"));
  await click(
    defined(
      Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "Customize",
      ),
    ),
  );
  await flushPromises();
}

describe("ConfigurableInputs", () => {
  it("renders every input in declared order with no stored choice", async () => {
    await mountPage({ inputs: () => h(ConfigurableInputs, null, textInputs) });
    expect(values()).toEqual(["Alpha", "3", "Ada"]);
  });

  it("hiding an input unmounts it and showing it puts it back in place", async () => {
    await mountPage({ inputs: () => h(ConfigurableInputs, null, textInputs) });
    await openPanel();
    expect(rowLabels()).toEqual(["Headline", "Views", "Author"]);

    await click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "Ada"]);

    await click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "3", "Ada"]);
  });

  describe("moving an input", () => {
    const layout = {
      rowSelector: "[data-slot=fields-selector-row]",
      rowHeight: 40,
    };
    const grip = (index: number) =>
      defined(
        document.querySelectorAll('button[aria-label="Drag to reorder"]')[
          index
        ],
      );
    const pointer = async (
      target: EventTarget,
      type: "pointerdown" | "pointermove" | "pointerup",
      at: { x: number; y: number },
    ) => {
      target.dispatchEvent(mousePointerEvent(type, at));
      await flushPromises();
    };
    const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

    beforeEach(() => {
      stubListDragDom(layout);
      // dnd-kit observes sizes and reads the reduced-motion preference.
      vi.stubGlobal("ResizeObserver", StubIntersectionObserver);
      vi.stubGlobal("matchMedia", () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      }));
      HTMLElement.prototype.setPointerCapture = () => {};
      HTMLElement.prototype.releasePointerCapture = () => {};
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("moving an input by button or by drag changes the render order and survives a remount", async () => {
      const first = await mountPage({
        inputs: () => h(ConfigurableInputs, null, textInputs),
      });
      await openPanel();

      await click(moveButton("Headline", "Move down"));
      await vi.waitFor(() => expect(values()).toEqual(["3", "Alpha", "Ada"]));
      expect(rowLabels()).toEqual(["Views", "Headline", "Author"]);

      // Drag Views, the first row, onto the last.
      const from = listCentre(grip(0), layout);
      await pointer(grip(0), "pointerdown", from);
      await pointer(document, "pointermove", { x: from.x + 10, y: from.y });
      await vi.waitFor(() =>
        expect(document.querySelector("[data-dragging]")).not.toBeNull(),
      );
      // Off the last row's exact centre: a zero distance has no ranking.
      const over = { x: 150, y: 2 * layout.rowHeight + 30 };
      await pointer(document, "pointermove", over);
      await sleep(100);
      await pointer(document, "pointerup", over);
      await vi.waitFor(() => expect(values()).toEqual(["Alpha", "Ada", "3"]));

      first.wrapper.unmount();
      mounted.pop();
      document.body.innerHTML = "";
      await mountPage({
        inputs: () => h(ConfigurableInputs, null, textInputs),
        store: first.store,
      });
      expect(values()).toEqual(["Alpha", "Ada", "3"]);
    });
  });

  it("defaultHiddenInputs hides inputs until a choice is stored", async () => {
    await mountPage({
      inputs: () =>
        h(ConfigurableInputs, { defaultHiddenInputs: ["views"] }, textInputs),
    });
    expect(values()).toEqual(["Alpha", "Ada"]);

    await openPanel();
    expect(switchFor("Views").checked).toBe(false);
    await click(switchFor("Author"));
    // Hiding one stores the choice, which now wins over the default.
    expect(values()).toEqual(["Alpha"]);
    await click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "3"]);
  });

  it("an input inside a v-if fragment is listed and arranged", async () => {
    await mountPage({
      inputs: () =>
        h(ConfigurableInputs, null, () => [
          h(TextInput, { source: "title" }),
          // What `v-if` leaves, and what `v-for` wraps in a fragment.
          null,
          [
            h(TextInput, { source: "views" }),
            h(TextInput, { source: "author" }),
          ],
        ]),
    });
    expect(values()).toEqual(["Alpha", "3", "Ada"]);

    await openPanel();
    expect(rowLabels()).toEqual(["Headline", "Views", "Author"]);
    await click(moveButton("Author", "Move up"));
    await vi.waitFor(() => expect(values()).toEqual(["Alpha", "Ada", "3"]));
    await click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "Ada"]);
  });

  it("a text node stays in place, shown and unlisted", async () => {
    await mountPage({
      inputs: () =>
        h(ConfigurableInputs, null, () => [
          "Required fields",
          h(TextInput, { source: "title" }),
          h("p", "A note"),
        ]),
    });
    expect(document.body.textContent).toContain("Required fields");

    await openPanel();
    // The paragraph is the second element, so `input-1`; the text has no id.
    expect(rowLabels()).toEqual(["Headline", "input-1"]);
    await click(switchFor("input-1"));
    expect(document.body.textContent).not.toContain("A note");
    expect(document.body.textContent).toContain("Required fields");
  });
});
