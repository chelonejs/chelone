/**
 * `<KanbanBoard>`: the records of the ambient `<List>` as columns. Mounted as
 * `<Admin><Resource list edit show/></Admin>` with a memory router; assertions
 * are on DOM, roles and data-provider calls. Drags are `pointerdown`,
 * `pointermove` and `pointerup`, which dnd-kit's pointer sensor reads. jsdom
 * lacks `PointerEvent`, layout, `elementFromPoint`, pointer capture and the
 * observers, so `layout` stubs them: the columns sit side by side, each card
 * under the one before it.
 */

import {
  type AnyCheloneI18n,
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import Resource from "../../admin/resource.vue";
import List from "../admin/view/list.vue";
import KanbanBoard from "./kanban-board.vue";

const TASKS = [
  { id: 1, title: "Write it", status: "todo", note: "soon" },
  { id: 2, title: "Ship it", status: "doing", note: "" },
  { id: 3, title: "Test it", status: "todo", note: null },
  { id: 4, title: "Lost it", status: "archived", note: "" },
];

const COLUMNS = [
  { id: "todo", label: "To do", className: "col-todo" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];

const View = defineComponent({ render: () => h("div") });

/**
 * `fakeDataProvider` edits its stored records in place and `getList` hands them
 * out as they are, so the list would hold the very objects an update changes.
 * Cloning on the way out keeps `previousData` as it was.
 */
function provider(): DataProvider {
  const inner = fakeDataProvider({ tasks: TASKS });
  const getList = inner.getList.bind(inner);
  inner.getList = async (...args) => structuredClone(await getList(...args));
  return inner;
}

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountBoard({
  board = {},
  slots,
  dataProvider = provider(),
  authProvider,
  i18n = createI18n({ locale: "en", messages: { en: {} } }),
  edit = true,
  show = true,
}: {
  board?: Record<string, unknown>;
  slots?: Record<string, unknown>;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  i18n?: AnyCheloneI18n;
  edit?: boolean;
  show?: boolean;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/tasks");
  const TaskList = defineComponent({
    setup: () => () =>
      h(
        List,
        { resource: "tasks" },
        {
          default: () =>
            h(
              KanbanBoard,
              { groupSource: "status", columns: COLUMNS, ...board },
              slots,
            ),
        },
      ),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          notifications,
          queryClient,
          i18n,
        },
        {
          default: () =>
            h(Resource, {
              name: "tasks",
              list: TaskList,
              edit: edit ? View : undefined,
              show: show ? View : undefined,
            }),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, router, notify };
}

/** A wrapper's node: `VueWrapper` is generic over an unknown instance here. */
const el = (node: { element: unknown }) => node.element as HTMLElement;
const column = (wrapper: VueWrapper, label: string) => {
  const found = wrapper.find(`[role="group"][aria-label="${label}"]`);
  if (!found.exists()) throw new Error(`no column named ${label}`);
  return found;
};
const cardsIn = (wrapper: VueWrapper, label: string) =>
  Array.from(
    el(column(wrapper, label)).querySelectorAll<HTMLElement>(
      "[data-slot=kanban-card]",
    ),
  );
const titleOf = (node: Element) =>
  node.querySelector("[data-slot=kanban-card-title]")?.textContent;
const cardTitles = (wrapper: VueWrapper, label: string) =>
  cardsIn(wrapper, label).map(titleOf);
const card = (wrapper: VueWrapper, title: string) => {
  const found = Array.from(
    el(wrapper).querySelectorAll<HTMLElement>("[data-slot=kanban-card]"),
  ).find((node) => titleOf(node) === title);
  if (!found) throw new Error(`no card titled ${title}`);
  return found;
};
const cardArea = (wrapper: VueWrapper, label: string) => {
  const found = el(column(wrapper, label)).querySelector<HTMLElement>(
    "[data-slot=kanban-column-cards]",
  );
  if (!found) throw new Error(`no card area in ${label}`);
  return found;
};
const moveButton = (wrapper: VueWrapper, title: string) => {
  const found = card(wrapper, title).querySelector<HTMLElement>(
    "button[data-slot=kanban-card-move]",
  );
  if (!found) throw new Error(`no Move button on ${title}`);
  return found;
};

/** A key or click event; renders on the next tick, so attributes read back as set. */
async function fire(
  target: Element,
  type: string,
  init: Record<string, unknown> = {},
): Promise<Event> {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries(init)) {
    Object.defineProperty(event, key, { value });
  }
  target.dispatchEvent(event);
  await nextTick();
  return event;
}

/** Focus an element and press a key on it, as a keyboard user does. */
async function press(target: HTMLElement, key: string): Promise<Event> {
  target.focus();
  return fire(target, "keydown", { key });
}

type PointerKind = "mouse" | "touch" | "pen";

const AREA = { width: 280, height: 600, gap: 20 };
const CARD = { height: 50, gap: 10, inset: 10 };

const rect = (x: number, y: number, width: number, height: number) =>
  ({
    x,
    y,
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  }) as DOMRect;

/** Where `layout` puts a column's card area. */
function areaRect(area: Element): DOMRect {
  const areas = Array.from(
    document.querySelectorAll("[data-slot=kanban-column-cards]"),
  );
  const x = areas.indexOf(area) * (AREA.width + AREA.gap);
  return rect(x, 0, AREA.width, AREA.height);
}

/**
 * jsdom has no layout, so give the card areas and cards a place, and the
 * browser APIs dnd-kit reads a stand-in. Not a mock of dnd-kit: the sensor,
 * the collision detection and the drag state all run as they do in a browser.
 */
function layout() {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  class ObserverStub {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      const box = target.getBoundingClientRect();
      queueMicrotask(() =>
        this.callback(
          [
            {
              target,
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: box,
              intersectionRect: box,
              rootBounds: null,
              time: 0,
            },
          ] as IntersectionObserverEntry[],
          this as unknown as IntersectionObserver,
        ),
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  const view = document.defaultView as unknown as Record<string, unknown>;
  vi.stubGlobal("PointerEvent", PointerEventStub);
  view.PointerEvent = PointerEventStub;
  vi.stubGlobal("IntersectionObserver", ObserverStub);
  view.IntersectionObserver = ObserverStub;
  vi.stubGlobal("ResizeObserver", ObserverStub);
  view.ResizeObserver = ObserverStub;

  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const slot = this.getAttribute("data-slot");
      if (slot === "kanban-column-cards") return areaRect(this);
      if (slot === "kanban-card") {
        const area = this.closest("[data-slot=kanban-column-cards]");
        if (!area) return rect(0, 0, 1024, 768);
        const box = areaRect(area);
        const index = Array.from(
          area.querySelectorAll("[data-slot=kanban-card]"),
        ).indexOf(this);
        // A browser moves the held card by the `translate` dnd-kit sets on it.
        const held = (this as HTMLElement).style
          .getPropertyValue("--dnd-translate")
          .match(/-?[\d.]+/g);
        const [dx = 0, dy = 0] = held ? held.map(Number) : [];
        return rect(
          box.x + CARD.inset + dx,
          CARD.inset + index * (CARD.height + CARD.gap) + dy,
          box.width - 2 * CARD.inset,
          CARD.height,
        );
      }
      // Every other element, such as the scrolling board, holds the whole window.
      return rect(0, 0, 1024, 768);
    },
  );
  document.elementFromPoint = (x: number, y: number) =>
    Array.from(
      document.querySelectorAll("[data-slot=kanban-column-cards]"),
    ).find((area) => {
      const box = areaRect(area);
      return x >= box.left && x < box.right && y >= box.top && y < box.bottom;
    }) ?? document.body;
  // dnd-kit reads the reduced-motion preference.
  Object.assign(document.defaultView as object, {
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  // The drop animation asks for running animations and plays one: none run,
  // and the one it plays has finished.
  Object.assign(document, { getAnimations: () => [] });
  Object.assign(Element.prototype, {
    getAnimations: () => [],
    animate: () => ({ finished: Promise.resolve(), cancel() {} }),
  });
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
}

beforeEach(() => {
  layout();
  // jsdom's CSS parser rejects the nested rules in dnd-kit's stylesheet, and
  // reports it on the console; the page works the same without it.
  const report = console.error.bind(console);
  vi.spyOn(console, "error").mockImplementation((...args) => {
    if (!String(args[0]).includes("Could not parse CSS stylesheet")) {
      report(...args);
    }
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const centre = (node: Element) => {
  const box = node.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

function pointer(
  target: EventTarget,
  type: string,
  at: { x: number; y: number },
  pointerType: PointerKind = "mouse",
  button = 0,
): Event {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    pointerType,
    button,
    clientX: at.x,
    clientY: at.y,
  });
  target.dispatchEvent(event);
  return event;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Let dnd-kit's frame-scheduled work and the renders it causes finish. */
async function settle() {
  await sleep(60);
  await flushPromises();
}

/**
 * Press a card and hold it until the sensor starts the drag: a mouse or pen
 * after a few pixels of movement, a touch after its hold. Returns where the
 * pointer is, so the caller can move on.
 */
async function pickUp(
  target: Element,
  pointerType: PointerKind = "mouse",
): Promise<{ x: number; y: number }> {
  const from = centre(target);
  pointer(target, "pointerdown", from, pointerType);
  if (pointerType === "touch") {
    await sleep(300);
  } else {
    const moved = { x: from.x + 8, y: from.y };
    pointer(document, "pointermove", moved, pointerType);
    await settle();
    return moved;
  }
  await flushPromises();
  return from;
}

/** Move the held card over a column's card area. */
async function moveOver(
  area: Element,
  pointerType: PointerKind = "mouse",
): Promise<{ x: number; y: number }> {
  const at = centre(area);
  pointer(document, "pointermove", at, pointerType);
  await settle();
  return at;
}

async function drop(
  at: { x: number; y: number },
  pointerType: PointerKind = "mouse",
) {
  pointer(document, "pointerup", at, pointerType);
  await settle();
}

/** Pick a card up and drop it on a column's card area. */
async function dragTo(
  wrapper: VueWrapper,
  title: string,
  label: string,
  pointerType: PointerKind = "mouse",
) {
  await pickUp(card(wrapper, title), pointerType);
  const at = await moveOver(cardArea(wrapper, label), pointerType);
  await drop(at, pointerType);
}

const denyEdit = (): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  canAccess: vi.fn(async () => false),
});

describe("<KanbanBoard>", () => {
  it("renders a column per definition, in order, with its label and card count", async () => {
    const { wrapper } = await mountBoard();

    const groups = wrapper.findAll('[role="group"]');
    expect(groups.map((g) => g.attributes("data-column-id"))).toEqual([
      "todo",
      "doing",
      "done",
    ]);
    expect(
      groups.every((g) => g.attributes("data-slot") === "kanban-column"),
    ).toBe(true);
    expect(
      column(wrapper, "To do")
        .classes()
        .some((c) => c === "col-todo"),
    ).toBe(true);
    const counts = groups.map((g) =>
      g.get("[data-slot=kanban-column-count]").text(),
    );
    expect(counts).toEqual(["2", "1", "0"]);
    expect(
      el(wrapper.get('[data-slot="kanban-board"]')).contains(el(groups[0]!)),
    ).toBe(true);
  });

  it("puts each record in the column its group value names", async () => {
    const { wrapper } = await mountBoard();

    expect(cardTitles(wrapper, "To do")).toEqual(["Write it", "Test it"]);
    expect(cardTitles(wrapper, "In progress")).toEqual(["Ship it"]);
    expect(card(wrapper, "Write it").dataset.recordId).toBe("1");
  });

  it("shows no card for a record whose group value matches no column", async () => {
    const { wrapper } = await mountBoard();

    expect(wrapper.text()).not.toContain("Lost it");
    expect(wrapper.findAll("[data-slot=kanban-card]")).toHaveLength(3);
  });

  it("an empty column shows the translated empty text", async () => {
    const { wrapper } = await mountBoard();

    const empty = column(wrapper, "Done").get("[data-slot=kanban-empty]");
    expect(empty.text()).toBe("No items");
    expect(
      column(wrapper, "To do").find("[data-slot=kanban-empty]").exists(),
    ).toBe(false);
  });

  it("the empty column re-translates when the locale changes", async () => {
    const i18n = createI18n({
      locale: "en",
      messages: {
        en: { "chelone.kanban_board.empty": "Nothing here" },
        fr: { "chelone.kanban_board.empty": "Rien ici" },
      },
    });
    const { wrapper } = await mountBoard({ i18n });

    const emptyText = () =>
      column(wrapper, "Done").get("[data-slot=kanban-empty]").text();
    expect(emptyText()).toBe("Nothing here");

    i18n.setLocale("fr");
    await nextTick();
    expect(emptyText()).toBe("Rien ici");
  });

  it("titleSource wins over the record representation and descriptionSource adds a line", async () => {
    const { wrapper } = await mountBoard({
      board: { titleSource: "note", descriptionSource: "status" },
    });

    expect(cardTitles(wrapper, "To do")).toEqual(["soon", "Test it"]);
    // A null value falls back to the representation, `title` by default.
    expect(
      Array.from(
        cardArea(wrapper, "To do").querySelectorAll(
          "[data-slot=kanban-card-description]",
        ),
      ).map((node) => node.textContent),
    ).toEqual(["todo", "todo"]);
  });

  it("the card slot replaces the card content", async () => {
    const { wrapper } = await mountBoard({
      slots: {
        card: ({ record }: { record: { id: number } }) =>
          h("em", { "data-testid": "custom" }, `#${record.id}`),
      },
    });

    const custom = wrapper.findAll('[data-testid="custom"]');
    expect(custom.map((node) => node.text())).toEqual(["#1", "#3", "#2"]);
    expect(wrapper.find("[data-slot=kanban-card-title]").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Write it");
  });

  it("dropping a card on another column calls update with the column id and the previous record", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper, notify } = await mountBoard({ dataProvider });

    await dragTo(wrapper, "Write it", "In progress");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "doing" },
      previousData: TASKS[0],
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it("the card changes column before the data provider answers", async () => {
    const dataProvider = provider();
    let answer: (value: unknown) => void = () => {};
    vi.spyOn(dataProvider, "update").mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }) as never,
    );
    const { wrapper } = await mountBoard({ dataProvider });

    await dragTo(wrapper, "Write it", "In progress");

    await vi.waitFor(() =>
      expect(cardTitles(wrapper, "In progress")).toEqual([
        "Write it",
        "Ship it",
      ]),
    );
    expect(cardTitles(wrapper, "To do")).toEqual(["Test it"]);
    answer({ data: { ...TASKS[0], status: "doing" } });
  });

  it("a rejected update puts the card back and notifies an error", async () => {
    const dataProvider = provider();
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("nope"));
    const { wrapper, notify } = await mountBoard({ dataProvider });

    await dragTo(wrapper, "Write it", "In progress");

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    await vi.waitFor(() =>
      expect(cardTitles(wrapper, "To do")).toEqual(["Write it", "Test it"]),
    );
    expect(cardTitles(wrapper, "In progress")).toEqual(["Ship it"]);
  });

  it("dropping a card on its own column writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await dragTo(wrapper, "Write it", "To do");

    expect(update).not.toHaveBeenCalled();
    expect(cardTitles(wrapper, "To do")).toEqual(["Write it", "Test it"]);
  });

  it("a drag that ends outside a column writes nothing and clears the highlight", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await pickUp(card(wrapper, "Write it"));
    await moveOver(cardArea(wrapper, "Done"));
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(true);
    const outside = { x: 2000, y: 2000 };
    pointer(document, "pointermove", outside);
    await settle();
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(false);
    await drop(outside);

    expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(cardTitles(wrapper, "To do")).toEqual(["Write it", "Test it"]);
  });

  it("a cancelled drag writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await pickUp(card(wrapper, "Write it"));
    await moveOver(cardArea(wrapper, "Done"));
    await press(document.body, "Escape");
    await settle();

    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(false);
    expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("marks the held card and the column under it while dragging", async () => {
    const { wrapper } = await mountBoard();

    expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(false);
    await pickUp(card(wrapper, "Write it"));
    expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(true);
    expect(card(wrapper, "Test it").hasAttribute("data-dragging")).toBe(false);

    await moveOver(cardArea(wrapper, "Done"));
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(true);
    expect(cardArea(wrapper, "To do").hasAttribute("data-over")).toBe(false);

    await moveOver(cardArea(wrapper, "In progress"));
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(false);
    expect(cardArea(wrapper, "In progress").hasAttribute("data-over")).toBe(
      true,
    );
  });

  it("a touch drag moves a card to another column", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await dragTo(wrapper, "Write it", "Done", "touch");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "done" },
      previousData: TASKS[0],
    });
  });

  it("a touch that moves before the hold ends starts no drag, so a swipe scrolls", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    const target = card(wrapper, "Write it");
    const from = centre(target);
    pointer(target, "pointerdown", from, "touch");
    pointer(document, "pointermove", { x: from.x + 40, y: from.y }, "touch");
    await sleep(300);
    await moveOver(cardArea(wrapper, "Done"), "touch");
    await drop(centre(cardArea(wrapper, "Done")), "touch");

    expect(target.hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("a click on a card selects it and starts no drag", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const onSelectCard = vi.fn();
    const { wrapper } = await mountBoard({
      dataProvider,
      board: { onSelectCard },
    });

    const target = card(wrapper, "Write it");
    const at = centre(target);
    pointer(target, "pointerdown", at);
    pointer(target, "pointerup", at);
    await fire(target, "click");
    await settle();

    expect(onSelectCard).toHaveBeenCalledTimes(1);
    expect(onSelectCard).toHaveBeenCalledWith(TASKS[0]);
    expect(target.hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("a press on the Move to button starts no drag", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    for (const kind of ["mouse", "touch"] as const) {
      const button = moveButton(wrapper, "Write it");
      const from = centre(button);
      pointer(button, "pointerdown", from, kind);
      await sleep(300);
      pointer(document, "pointermove", { x: from.x + 8, y: from.y }, kind);
      await moveOver(cardArea(wrapper, "Done"), kind);

      expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(
        false,
      );
      await drop(centre(cardArea(wrapper, "Done")), kind);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("no card carries the native draggable attribute", async () => {
    const { wrapper } = await mountBoard();

    const cards = wrapper.findAll("[data-slot=kanban-card]");
    expect(cards).toHaveLength(3);
    for (const node of cards)
      expect(node.attributes("draggable")).toBe(undefined);
  });

  it("attributes put on the board land on the board element", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { wrapper } = await mountBoard({
      board: {
        id: "tasks-board",
        style: "max-height: 400px",
        "aria-label": "Tasks",
        "data-testid": "board",
        class: "extra",
      },
    });

    const board = wrapper.find("[data-slot=kanban-board]");
    expect(board.attributes("data-testid")).toBe("board");
    expect(board.attributes("id")).toBe("tasks-board");
    expect(board.attributes("aria-label")).toBe("Tasks");
    expect(board.attributes("style")).toContain("max-height");
    expect(board.classes()).toContain("extra");
    expect(
      warn.mock.calls.some((call) => String(call[0]).includes("Extraneous")),
    ).toBe(false);
  });

  it("cards are not draggable when edit access is denied", async () => {
    const authProvider = denyEdit();
    const { wrapper } = await mountBoard({ authProvider });
    await vi.waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());

    expect(card(wrapper, "Write it").hasAttribute("data-draggable")).toBe(
      false,
    );
    expect(wrapper.find("button[data-slot=kanban-card-move]").exists()).toBe(
      false,
    );
  });

  it("cards are draggable with edit access", async () => {
    const { wrapper } = await mountBoard();

    expect(card(wrapper, "Write it").hasAttribute("data-draggable")).toBe(true);
    expect(moveButton(wrapper, "Write it").getAttribute("aria-label")).toBe(
      "Move Write it",
    );
  });

  it("the Move to menu lists the other columns and moving with the keyboard calls update like a drop", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    const trigger = moveButton(wrapper, "Write it");
    trigger.focus();
    // Enter on a focused button dispatches a click; jsdom does not do it for us.
    await fire(trigger, "click");

    const items = wrapper.findAll('[role="menuitem"]');
    expect(items.map((item) => item.text())).toEqual(["In progress", "Done"]);

    // The item is a `role="menuitem"` div with `tabindex="0"`: Tab reaches it,
    // and Enter is its activation. A synthetic click would hide that.
    const item = el(items[1]!);
    expect(item.getAttribute("tabindex")).toBe("0");
    await press(item, "Enter");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "done" },
      previousData: TASKS[0],
    });
    await vi.waitFor(() =>
      expect(cardTitles(wrapper, "Done")).toEqual(["Write it"]),
    );
    expect(wrapper.find('[role="menuitem"]').exists()).toBe(false);
  });

  it("Space on a Move menu item moves the card and does not scroll the page", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await fire(moveButton(wrapper, "Write it"), "click");
    const [first] = wrapper.findAll('[role="menuitem"]');
    const space = await press(el(first!), " ");

    expect(space.defaultPrevented).toBe(true);
    expect(wrapper.find('[role="menuitem"]').exists()).toBe(false);
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "doing" },
      previousData: TASKS[0],
    });
  });

  it("Escape closes the Move menu and writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await fire(moveButton(wrapper, "Write it"), "click");
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(2);

    const [first] = wrapper.findAll('[role="menuitem"]');
    await press(el(first!), "Escape");

    expect(wrapper.find('[role="menuitem"]').exists()).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("a key that is not Enter or Space leaves the menu open and writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountBoard({ dataProvider });

    await fire(moveButton(wrapper, "Write it"), "click");
    const [first] = wrapper.findAll('[role="menuitem"]');
    await press(el(first!), "x");

    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(2);
    expect(update).not.toHaveBeenCalled();
  });

  it("a select-card listener receives the record and replaces the navigation", async () => {
    const onSelectCard = vi.fn();
    const { wrapper, router } = await mountBoard({ board: { onSelectCard } });

    await fire(card(wrapper, "Write it"), "click");
    expect(onSelectCard).toHaveBeenLastCalledWith(TASKS[0]);
    await fire(card(wrapper, "Ship it"), "keydown", { key: "Enter" });
    expect(onSelectCard).toHaveBeenLastCalledWith(TASKS[1]);
    await fire(card(wrapper, "Test it"), "keydown", { key: " " });
    expect(onSelectCard).toHaveBeenLastCalledWith(TASKS[2]);
    expect(onSelectCard).toHaveBeenCalledTimes(3);
    expect(router.currentRoute.value.path).toBe("/tasks");
  });

  it("without a listener a card opens the edit page, or the show page when there is no edit view", async () => {
    const edit = await mountBoard();
    await fire(card(edit.wrapper, "Write it"), "click");
    await flushPromises();
    expect(edit.router.currentRoute.value.path).toBe("/tasks/1");

    const show = await mountBoard({ edit: false });
    await fire(card(show.wrapper, "Ship it"), "keydown", { key: "Enter" });
    await flushPromises();
    expect(show.router.currentRoute.value.path).toBe("/tasks/2/show");
  });

  it("linkType false leaves cards inert", async () => {
    const { wrapper, router } = await mountBoard({
      board: { linkType: false },
    });

    await fire(card(wrapper, "Write it"), "click");
    await fire(card(wrapper, "Write it"), "keydown", { key: "Enter" });

    expect(router.currentRoute.value.path).toBe("/tasks");
  });

  it("renders a title and description that hold markup as text", async () => {
    const markup = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const { wrapper } = await mountBoard({
      dataProvider: fakeDataProvider({
        tasks: [{ id: 1, title: markup, status: "todo", note: script }],
      }),
      board: { titleSource: "title", descriptionSource: "note" },
    });

    expect(wrapper.text()).toContain(markup);
    expect(wrapper.text()).toContain(script);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("a card slot that holds a link drags nothing when edit access is denied", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const authProvider = denyEdit();
    const { wrapper } = await mountBoard({
      dataProvider,
      authProvider,
      slots: {
        card: ({ record }: { record: { id: number } }) =>
          h("a", { href: "#x", "data-testid": `link-${record.id}` }, "open"),
      },
    });
    await vi.waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());

    // The link is interactive, so a press on it never starts a drag; the
    // card around it is the other place a press can land.
    for (const target of [
      el(wrapper.get('[data-testid="link-1"]')),
      el(wrapper.findAll("[data-slot=kanban-card]")[0]!),
    ]) {
      await pickUp(target);
      await moveOver(cardArea(wrapper, "Done"));
      expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(false);
      await drop(centre(cardArea(wrapper, "Done")));
    }

    expect(update).not.toHaveBeenCalled();
  });
});
