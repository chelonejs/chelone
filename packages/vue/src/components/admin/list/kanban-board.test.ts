/**
 * `<KanbanBoard>`: the records of the ambient `<List>` as columns. Mounted as
 * `<Admin><Resource list edit show/></Admin>` with a memory router; assertions
 * are on DOM, roles and data-provider calls. Drag events are dispatched by hand
 * with a stub `dataTransfer`, since jsdom has neither `DragEvent` nor
 * `DataTransfer`.
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import List from "../view/list.vue";
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

function stubTransfer() {
  return { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };
}

/**
 * A drag event jsdom cannot build: `dataTransfer` and `relatedTarget` are set
 * with `defineProperty`, because both are read-only accessors on jsdom's event
 * prototypes. Renders on the next tick, so attributes read back as set.
 */
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

/** Pick a card up and drop it on a column's card area. */
async function dragTo(
  wrapper: VueWrapper,
  title: string,
  label: string,
  dataTransfer = stubTransfer(),
) {
  await fire(card(wrapper, title), "dragstart", { dataTransfer });
  await fire(cardArea(wrapper, label), "dragover", { dataTransfer });
  await fire(cardArea(wrapper, label), "drop", { dataTransfer });
  await fire(card(wrapper, title), "dragend", { dataTransfer });
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
    const dataTransfer = stubTransfer();

    await fire(card(wrapper, "Write it"), "dragstart", { dataTransfer });
    await fire(cardArea(wrapper, "Done"), "dragover", { dataTransfer });
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(true);
    await fire(card(wrapper, "Write it"), "dragend", { dataTransfer });

    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(false);
    expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
    // With nothing held, a column takes no drop.
    const over = await fire(cardArea(wrapper, "Done"), "dragover", {
      dataTransfer,
    });
    expect(over.defaultPrevented).toBe(false);
  });

  it("marks the held card and the column under it while dragging", async () => {
    const { wrapper } = await mountBoard();
    const dataTransfer = stubTransfer();

    await fire(card(wrapper, "Write it"), "dragstart", { dataTransfer });
    expect(dataTransfer.effectAllowed).toBe("move");
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "1");
    expect(card(wrapper, "Write it").hasAttribute("data-dragging")).toBe(true);

    const over = await fire(cardArea(wrapper, "Done"), "dragover", {
      dataTransfer,
    });
    expect(over.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(true);

    // Moving onto a child of the area is not leaving it.
    await fire(cardArea(wrapper, "To do"), "dragleave", {
      relatedTarget: card(wrapper, "Test it"),
    });
    await fire(cardArea(wrapper, "To do"), "dragover", { dataTransfer });
    await fire(cardArea(wrapper, "To do"), "dragleave", {
      relatedTarget: card(wrapper, "Test it"),
    });
    expect(cardArea(wrapper, "To do").hasAttribute("data-over")).toBe(true);
    await fire(cardArea(wrapper, "To do"), "dragleave", {
      relatedTarget: document.body,
    });
    expect(cardArea(wrapper, "To do").hasAttribute("data-over")).toBe(false);
  });

  it("cards are not draggable when edit access is denied", async () => {
    const authProvider = denyEdit();
    const { wrapper } = await mountBoard({ authProvider });
    await vi.waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());

    expect(card(wrapper, "Write it").getAttribute("draggable")).toBe("false");
    expect(wrapper.find("button[data-slot=kanban-card-move]").exists()).toBe(
      false,
    );
  });

  it("cards are draggable with edit access", async () => {
    const { wrapper } = await mountBoard();

    expect(card(wrapper, "Write it").getAttribute("draggable")).toBe("true");
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

    const link = el(wrapper.get('[data-testid="link-1"]'));
    const dataTransfer = stubTransfer();
    await fire(link, "dragstart", { dataTransfer });
    await fire(cardArea(wrapper, "Done"), "dragover", { dataTransfer });
    await fire(cardArea(wrapper, "Done"), "drop", { dataTransfer });

    expect(dataTransfer.setData).not.toHaveBeenCalled();
    expect(cardArea(wrapper, "Done").hasAttribute("data-over")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
