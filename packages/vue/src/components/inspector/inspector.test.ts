/**
 * The inspector add-on mounted the way an app does: `<Inspector>` wrapping the
 * page in the `#layout` slot of a real `<Admin>`. Assertions are on DOM, roles
 * and the store; jsdom applies no CSS, so nothing here checks styling or what
 * hover shows.
 */

import {
  type CheloneStore,
  createStore,
  fakeDataProvider,
  inspectorPositionKey,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import {
  StubIntersectionObserver,
  StubPointerEvent,
  stubAnimations,
} from "@chelone/test-utils/drag-dom";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import DataTable from "../admin/list/data-table.vue";
import DataTableCol from "../admin/list/data-table-col.vue";
import List from "../admin/view/list.vue";
import Configurable from "./configurable.vue";
import Inspector from "./inspector.vue";
import InspectorButton from "./inspector-button.vue";
import SortableFieldsSelector from "./sortable-fields-selector.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.innerWidth = 1024;
  window.innerHeight = 768;
});

interface MountOptions {
  page: () => VNodeChild;
  /** Mount without an `<Inspector>` around the page. */
  inspector?: boolean;
  store?: CheloneStore;
}

async function mountPage({
  page,
  inspector = true,
  store = createStore(),
}: MountOptions) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/");
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({ posts: [{ id: 1, title: "Alpha" }] }),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      store,
    },
    slots: {
      layout: () =>
        inspector
          ? h(Inspector, null, { default: page })
          : h("div", null, [page()]),
    },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, store };
}

const modeButton = (wrapper: VueWrapper) =>
  wrapper.get('button[aria-label="Configure mode"]');
const panel = (wrapper: VueWrapper) => wrapper.find('[role="dialog"]');

describe("InspectorButton", () => {
  it("toggles configure mode and reports it with aria-pressed", async () => {
    const { wrapper } = await mountPage({ page: () => h(InspectorButton) });
    const button = modeButton(wrapper);
    expect(button.attributes("aria-pressed")).toBe("false");
    expect(panel(wrapper).exists()).toBe(false);

    await button.trigger("click");
    expect(button.attributes("aria-pressed")).toBe("true");
    expect(panel(wrapper).exists()).toBe(true);

    await button.trigger("click");
    expect(button.attributes("aria-pressed")).toBe("false");
    expect(panel(wrapper).exists()).toBe(false);
  });

  it("does not toggle when a click listener prevents the default", async () => {
    const onClick = vi.fn((event: Event) => event.preventDefault());
    const { wrapper } = await mountPage({
      page: () => h(InspectorButton, { onClick }),
    });
    const button = modeButton(wrapper);

    await button.trigger("click");
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.attributes("aria-pressed")).toBe("false");
    expect(panel(wrapper).exists()).toBe(false);
  });

  it("renders nothing without an Inspector", async () => {
    const { wrapper } = await mountPage({
      page: () => [h(InspectorButton), h("span", "page ready")],
      inspector: false,
    });
    expect(wrapper.text()).toContain("page ready");
    expect(wrapper.find('button[aria-label="Configure mode"]').exists()).toBe(
      false,
    );
  });
});

const handleOf = (wrapper: VueWrapper) =>
  wrapper.get("[data-slot=inspector-handle]");

describe("Inspector", () => {
  it("shows the hint while nothing is selected and closes with the Close button", async () => {
    const { wrapper } = await mountPage({ page: () => h(InspectorButton) });
    await modeButton(wrapper).trigger("click");

    const dialog = wrapper.get('[role="dialog"][aria-label="Inspector"]');
    expect(dialog.text()).toContain("Pick an outlined element to configure it");

    await dialog.get('button[aria-label="Close"]').trigger("click");
    expect(panel(wrapper).exists()).toBe(false);
    expect(modeButton(wrapper).attributes("aria-pressed")).toBe("false");
  });

  it("dragging the header and the arrow keys store a clamped position", async () => {
    const { wrapper, store } = await mountPage({
      page: () => h(InspectorButton),
    });
    await modeButton(wrapper).trigger("click");
    const dialog = wrapper.get<HTMLElement>('[role="dialog"]');
    const style = () => dialog.element.style;
    // The top right corner of a 1024 px window: 1024 - 320 - 8.
    expect(style().left).toBe("696px");
    expect(style().top).toBe("8px");
    expect(handleOf(wrapper).attributes("tabindex")).toBe("0");

    const at = async (type: string, x: number, y: number) => {
      const target =
        type === "pointerdown" ? handleOf(wrapper).element : window;
      target.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          button: 0,
        }),
      );
      await flushPromises();
    };
    await at("pointerdown", 700, 20);
    await at("pointermove", 500, 100);
    expect(style().left).toBe("496px");
    expect(style().top).toBe("88px");
    // Nothing is stored until the button is released.
    expect(store.getItem(inspectorPositionKey)).toBeUndefined();

    await at("pointermove", -900, 5000);
    await at("pointerup", -900, 5000);
    // Clamped to the margin on the left and a handle's height above the bottom.
    expect(store.getItem(inspectorPositionKey)).toEqual({ x: 8, y: 720 });
    expect(style().left).toBe("8px");
    expect(style().top).toBe("720px");

    await handleOf(wrapper).trigger("keydown", { key: "ArrowRight" });
    expect(store.getItem(inspectorPositionKey)).toEqual({ x: 24, y: 720 });
    await handleOf(wrapper).trigger("keydown", { key: "ArrowUp" });
    await handleOf(wrapper).trigger("keydown", { key: "ArrowLeft" });
    expect(store.getItem(inspectorPositionKey)).toEqual({ x: 8, y: 704 });
    expect(style().left).toBe("8px");
    expect(style().top).toBe("704px");
  });

  it("clamps a stored position that no longer fits the window", async () => {
    const store = createStore();
    store.setItem(inspectorPositionKey, { x: 900, y: 600 });
    const { wrapper } = await mountPage({
      page: () => h(InspectorButton),
      store,
    });
    await modeButton(wrapper).trigger("click");
    const dialog = wrapper.get<HTMLElement>('[role="dialog"]');
    const style = () => dialog.element.style;
    expect(style().left).toBe("696px");

    window.innerWidth = 600;
    window.dispatchEvent(new Event("resize"));
    await flushPromises();
    expect(style().left).toBe("272px");
  });
});

/** A Configurable that its page can remove, to unmount it while selected. */
const Toggled = defineComponent({
  props: { label: { type: String, required: true } },
  setup(props) {
    const shown = ref(true);
    return () => [
      h(
        "button",
        { onClick: () => (shown.value = false) },
        `Remove ${props.label}`,
      ),
      shown.value
        ? h(
            Configurable,
            { preferenceKey: props.label, title: props.label },
            {
              default: () => h("span", `${props.label} content`),
              editor: () => h("p", `${props.label} editor`),
            },
          )
        : null,
    ];
  },
});

const customize = (wrapper: VueWrapper) =>
  wrapper.findAll("button").filter((b) => b.text() === "Customize");

describe("Configurable", () => {
  it("renders only its content without an Inspector", async () => {
    const { wrapper } = await mountPage({
      page: () =>
        h(
          Configurable,
          { preferenceKey: "a" },
          { default: () => h("span", "child"), editor: () => h("p", "editor") },
        ),
      inspector: false,
    });
    const child = wrapper.get("span");
    expect(child.text()).toBe("child");
    expect(child.element.parentElement?.hasAttribute("data-slot")).toBe(false);
    expect(wrapper.find("[data-slot=configurable]").exists()).toBe(false);
    expect(customize(wrapper)).toHaveLength(0);
  });

  it("keeps its content mounted when configure mode turns on", async () => {
    const { wrapper } = await mountPage({
      page: () => [
        h(InspectorButton),
        h(
          Configurable,
          { preferenceKey: "a" },
          {
            default: () => h("input", { "aria-label": "inner" }),
            editor: () => h("p", "editor"),
          },
        ),
      ],
    });
    const input = wrapper.get('input[aria-label="inner"]');
    const region = wrapper.get("[data-slot=configurable]");
    expect(region.attributes("data-inspector-enabled")).toBeUndefined();
    expect(customize(wrapper)).toHaveLength(0);

    await modeButton(wrapper).trigger("click");
    expect(wrapper.get('input[aria-label="inner"]').element).toBe(
      input.element,
    );
    expect(input.element.closest("[data-slot=configurable]")).toBe(
      region.element,
    );
    expect(region.attributes("data-inspector-enabled")).toBe("");
    expect(customize(wrapper)).toHaveLength(1);
  });

  it("Customize opens the editor slot in the panel with its title", async () => {
    const { wrapper } = await mountPage({
      page: () => [
        h(InspectorButton),
        h(
          Configurable,
          { preferenceKey: "a", title: "Post header" },
          {
            default: () => h("span", "header"),
            editor: () => h("p", "header editor"),
          },
        ),
      ],
    });
    await modeButton(wrapper).trigger("click");
    await defined(customize(wrapper)[0]).trigger("click");

    const dialog = wrapper.get('[role="dialog"][aria-label="Post header"]');
    expect(dialog.text()).toContain("header editor");
    expect(dialog.text()).not.toContain(
      "Pick an outlined element to configure it",
    );
    expect(
      wrapper.get("[data-slot=configurable]").attributes("data-selected"),
    ).toBe("");
  });

  it("unmounting the selected one empties the panel, and unmounting another does not", async () => {
    const { wrapper } = await mountPage({
      page: () => [
        h(InspectorButton),
        h(Toggled, { label: "First" }),
        h(Toggled, { label: "Second" }),
      ],
    });
    await modeButton(wrapper).trigger("click");
    await defined(customize(wrapper)[1]).trigger("click");
    expect(wrapper.text()).toContain("Second editor");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Remove First")
      ?.trigger("click");
    expect(wrapper.text()).toContain("Second editor");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Remove Second")
      ?.trigger("click");
    expect(wrapper.text()).not.toContain("Second editor");
    expect(wrapper.text()).toContain(
      "Pick an outlined element to configure it",
    );
  });

  it("a title with markup renders as text", async () => {
    const title = "<img src=x onerror=alert(1)>";
    const { wrapper } = await mountPage({
      page: () => [
        h(InspectorButton),
        h(
          Configurable,
          { preferenceKey: "a", title },
          { default: () => h("span", "child"), editor: () => h("p", "e") },
        ),
      ],
    });
    await modeButton(wrapper).trigger("click");
    await defined(customize(wrapper)[0]).trigger("click");

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes("aria-label")).toBe(title);
    expect(dialog.text()).toContain(title);
    expect(document.querySelector("img")).toBeNull();
  });
});

/**
 * jsdom has no `PointerEvent`, layout or `elementFromPoint`, so a drag stubs
 * them and dnd-kit runs unmocked: rows stack 40 px apart in list order.
 */
const ROW_HEIGHT = 40;

function rectOf(el: Element): DOMRect {
  const row = el.closest("[data-slot=fields-selector-row]");
  const rows = Array.from(
    document.querySelectorAll("[data-slot=fields-selector-row]"),
  );
  const [x, y, width, height] = row
    ? [0, rows.indexOf(row) * ROW_HEIGHT, 300, ROW_HEIGHT]
    : [0, 0, 1024, 768];
  // The held row moves with a CSS translate, which jsdom does not lay out.
  const [dx = 0, dy = 0] = (
    (el instanceof HTMLElement &&
      el.style.getPropertyValue("--dnd-translate")) ||
    ""
  )
    .split(" ")
    .map((n) => Number.parseFloat(n) || 0);
  return new DOMRect(x + dx, y + dy, width, height);
}

function stubDragDom() {
  vi.stubGlobal("PointerEvent", StubPointerEvent);
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  vi.stubGlobal("ResizeObserver", StubIntersectionObserver);
  stubAnimations();
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  // dnd-kit reads the reduced-motion preference.
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return rectOf(this);
    },
  );
  document.elementFromPoint = (_x: number, y: number) =>
    document.querySelectorAll<HTMLElement>("[data-slot=fields-selector-row]")[
      Math.floor(y / ROW_HEIGHT)
    ] ?? document.body;
}

const STORE_KEY = "posts.datatable";
const columns = () =>
  ["title", "views", "author"].map((source) =>
    h(DataTableCol, { source, key: source }),
  );
const headers = (wrapper: VueWrapper) =>
  wrapper.findAll("th").map((th) => th.text());
const rowLabels = (wrapper: VueWrapper) =>
  wrapper.findAll("[data-slot=fields-selector-row]").map((row) => row.text());
const grip = (wrapper: VueWrapper, index: number) =>
  defined(wrapper.findAll('button[aria-label="Drag to reorder"]')[index])
    .element;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const centre = (el: Element) => {
  const { x, y, width, height } = rectOf(el);
  return { x: x + width / 2, y: y + height / 2 };
};
async function pointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  at: { x: number; y: number },
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: at.x,
      clientY: at.y,
      pointerType: "mouse",
      pointerId: 1,
      isPrimary: true,
      button: 0,
    }),
  );
  await flushPromises();
}

describe("SortableFieldsSelector", () => {
  beforeEach(stubDragDom);
  afterEach(() => vi.unstubAllGlobals());

  it("dragging a row onto another moves the column", async () => {
    const { wrapper } = await mountPage({
      page: () =>
        h(List, { resource: "posts" }, () => [
          h(SortableFieldsSelector, { storeKey: STORE_KEY, resource: "posts" }),
          h(DataTable, null, columns),
        ]),
    });
    await vi.waitFor(() =>
      expect(headers(wrapper)).toEqual(["Title", "Views", "Author"]),
    );

    const from = centre(grip(wrapper, 0));
    await pointer(grip(wrapper, 0), "pointerdown", from);
    await pointer(document, "pointermove", { x: from.x + 10, y: from.y });
    await vi.waitFor(() =>
      expect(wrapper.find("[data-dragging]").exists()).toBe(true),
    );
    // Over the last row, off its exact centre: a zero distance has no ranking.
    const over = { x: 150, y: 2 * ROW_HEIGHT + 30 };
    await pointer(document, "pointermove", over);
    // dnd-kit ranks the targets on a later frame, so the drop waits for it.
    await sleep(100);
    await pointer(document, "pointerup", over);

    await vi.waitFor(() =>
      expect(headers(wrapper)).toEqual(["Views", "Author", "Title"]),
    );
    expect(rowLabels(wrapper)).toEqual(["Views", "Author", "Title"]);
  });
});
