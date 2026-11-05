/**
 * `<KanbanBoard>`: the records of the ambient `<List>` as columns. Mounted as
 * `<MemoryRouter><Admin><Resource list edit show/></Admin></MemoryRouter>`;
 * assertions are on DOM, roles and data-provider calls. A drag is driven with
 * pointer events; jsdom has no `PointerEvent`, element geometry or
 * `elementFromPoint`, so the test stubs those and dnd-kit runs unmocked.
 */
import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  getAtPath,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  getConfig,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../admin/admin";
import { Resource } from "../../resource";
import { List } from "../admin/views/list";
import { KanbanBoard, type KanbanBoardProps } from "./kanban-board";

afterEach(cleanup);

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

function Path() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function mount({
  board = {},
  dataProvider = provider(),
  authProvider,
  edit = true,
  show = true,
  resourceProps = {},
}: {
  board?: Partial<KanbanBoardProps>;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  edit?: boolean;
  show?: boolean;
  resourceProps?: Partial<ComponentProps<typeof Resource>>;
} = {}) {
  const View = () => null;
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const list = (): ReactNode => (
    <List>
      <KanbanBoard groupSource="status" columns={COLUMNS} {...board} />
    </List>
  );
  render(
    <MemoryRouter initialEntries={["/tasks"]}>
      <Path />
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        queryClient={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        notifications={notifications}
      >
        <Resource
          name="tasks"
          list={list}
          edit={edit ? View : undefined}
          show={show ? View : undefined}
          {...resourceProps}
        />
      </Admin>
    </MemoryRouter>,
  );
  return { notify };
}

const column = (label: string) => screen.getByRole("group", { name: label });
const cardsIn = (label: string) =>
  Array.from(
    column(label).querySelectorAll<HTMLElement>("[data-slot=kanban-card]"),
  );
const titleOf = (node: Element) =>
  node.querySelector("[data-slot=kanban-card-title]")?.textContent;
const cardTitles = (label: string) => cardsIn(label).map(titleOf);
const card = (title: string) => {
  const found = Array.from(
    document.querySelectorAll<HTMLElement>("[data-slot=kanban-card]"),
  ).find((node) => titleOf(node) === title);
  if (!found) throw new Error(`no card titled ${title}`);
  return found;
};
const cardWithId = (id: number) => {
  const found = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
  if (!found) throw new Error(`no card with id ${id}`);
  return found;
};
const cardArea = (label: string) => {
  const found = column(label).querySelector<HTMLElement>(
    "[data-slot=kanban-column-cards]",
  );
  if (!found) throw new Error(`no card area in ${label}`);
  return found;
};

const COLUMN_IDS = COLUMNS.map((c) => c.id);
const COLUMN_WIDTH = 280;
const COLUMN_STRIDE = 300;
const CARD_HEIGHT = 50;

/** Where an element sits on the stubbed canvas: columns side by side, cards stacked. */
function rectOf(el: Element): DOMRect {
  const make = (
    x: number,
    y: number,
    width: number,
    height: number,
  ): DOMRect => ({
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  });
  const area = el.closest("[data-slot=kanban-column-cards]");
  const col = el.closest<HTMLElement>("[data-slot=kanban-column]");
  // dnd-kit clips a rect to its ancestors, so they cover the whole window.
  if (!area || !col) return make(0, 0, 1024, 768);
  const x = COLUMN_IDS.indexOf(col.dataset.columnId ?? "") * COLUMN_STRIDE;
  if (el === area) return make(x, 0, COLUMN_WIDTH, 600);
  const cards = Array.from(area.querySelectorAll("[data-slot=kanban-card]"));
  const at = cards.findIndex((c) => c === el || c.contains(el));
  // dnd-kit moves the held card with a CSS translate, which jsdom does not lay out; it shows as a custom property.
  const translate =
    el instanceof HTMLElement
      ? el.style.getPropertyValue("--dnd-translate")
      : "";
  const [dx, dy] = (translate || "0px 0px")
    .split(" ")
    .map((n) => Number.parseFloat(n) || 0);
  return make(
    x + 10 + (dx ?? 0),
    10 + at * (CARD_HEIGHT + 10) + (dy ?? 0),
    260,
    CARD_HEIGHT,
  );
}

class StubPointerEvent extends MouseEvent {
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

/** What dnd-kit's drop animation needs of an Animation: it finishes at once. */
class StubAnimation extends EventTarget implements Animation {
  currentTime: CSSNumberish | null = null;
  effect: AnimationEffect | null = null;
  finished = Promise.resolve(this);
  id = "";
  oncancel = null;
  onfinish = null;
  onremove = null;
  pending = false;
  playState: AnimationPlayState = "finished";
  playbackRate = 1;
  ready = Promise.resolve(this);
  replaceState: AnimationReplaceState = "active";
  startTime: CSSNumberish | null = null;
  timeline: AnimationTimeline | null = null;
  cancel() {}
  commitStyles() {}
  finish() {}
  pause() {}
  persist() {}
  play() {}
  reverse() {}
  updatePlaybackRate() {}
}

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal("PointerEvent", StubPointerEvent);
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  document.getAnimations = () => [];
  Element.prototype.getAnimations = () => [];
  Element.prototype.animate = () => new StubAnimation();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return rectOf(this);
    },
  );
  // Every pointer is over the card area of the column whose x range holds it.
  document.elementFromPoint = (x: number) =>
    document.querySelectorAll<HTMLElement>("[data-slot=kanban-column-cards]")[
      Math.floor(x / COLUMN_STRIDE)
    ] ?? document.body;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Real time outside `act`, for asserting that nothing happens: React holds back
 * renders queued inside an `act` scope, and dnd-kit waits for a render.
 */
const wait = (ms: number) =>
  getConfig().asyncWrapper(
    () => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  );
const settle = () => wait(100);
const centre = (el: Element) => {
  const { x, y, width, height } = rectOf(el);
  return { x: x + width / 2, y: y + height / 2 };
};
/** A point inside a column's card area, off its exact centre (a zero distance has no ranking). */
const insideArea = (label: string) => {
  const { x, y } = centre(cardArea(label));
  return { x: x + 20, y: y + 20 };
};
const pointer = (
  target: Element | Document,
  type: "pointerdown" | "pointermove" | "pointerup",
  at: { x: number; y: number },
  pointerType: "mouse" | "touch" = "mouse",
) => {
  fireEvent(
    target,
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: at.x,
      clientY: at.y,
      pointerType,
      pointerId: 1,
      isPrimary: true,
      button: 0,
    }),
  );
};

/** Press a card and move past the activation distance; the card is then held. */
async function pickUp(title: string, pointerType: "mouse" | "touch" = "mouse") {
  const held = card(title);
  const from = centre(held);
  pointer(held, "pointerdown", from, pointerType);
  // A touch drag starts after its hold, a mouse drag after a few pixels.
  if (pointerType === "mouse") {
    pointer(
      document,
      "pointermove",
      { x: from.x + 10, y: from.y },
      pointerType,
    );
  }
  await waitFor(() =>
    expect(document.querySelector("[data-dragging]")).not.toBeNull(),
  );
}

/** Move the held card over a column's card area and wait for the highlight. */
async function moveOver(
  label: string,
  pointerType: "mouse" | "touch" = "mouse",
) {
  pointer(document, "pointermove", insideArea(label), pointerType);
  await waitFor(() =>
    expect(cardArea(label).hasAttribute("data-over")).toBe(true),
  );
}

/** Pick a card up and drop it on a column's card area. */
async function dragTo(
  title: string,
  label: string,
  pointerType: "mouse" | "touch" = "mouse",
) {
  await pickUp(title, pointerType);
  await moveOver(label, pointerType);
  pointer(document, "pointerup", insideArea(label), pointerType);
  await waitFor(() =>
    expect(document.querySelector("[data-dragging]")).toBeNull(),
  );
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
    mount();
    await screen.findByText("Write it");

    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("data-column-id"))).toEqual([
      "todo",
      "doing",
      "done",
    ]);
    expect(groups.every((g) => g.dataset.slot === "kanban-column")).toBe(true);
    expect(column("To do").classList.contains("col-todo")).toBe(true);
    const counts = groups.map(
      (g) => g.querySelector("[data-slot=kanban-column-count]")?.textContent,
    );
    expect(counts).toEqual(["2", "1", "0"]);
    expect(
      document
        .querySelector("[data-slot=kanban-board]")
        ?.contains(groups[0] ?? null),
    ).toBe(true);
  });

  it("puts each record in the column its group value names", async () => {
    mount();
    await screen.findByText("Write it");

    expect(cardTitles("To do")).toEqual(["Write it", "Test it"]);
    expect(cardTitles("In progress")).toEqual(["Ship it"]);
    expect(card("Write it").getAttribute("data-record-id")).toBe("1");
  });

  it("shows no card for a record whose group value matches no column", async () => {
    mount();
    await screen.findByText("Write it");

    expect(screen.queryByText("Lost it")).toBeNull();
  });

  it("an empty column shows the translated empty text", async () => {
    mount();
    await screen.findByText("Write it");

    expect(within(column("Done")).getByText("No items").dataset.slot).toBe(
      "kanban-empty",
    );
    expect(within(column("To do")).queryByText("No items")).toBeNull();
  });

  it("titleSource wins over the record representation and descriptionSource adds a line", async () => {
    mount({ board: { titleSource: "note", descriptionSource: "status" } });
    await screen.findByText("soon");

    expect(cardTitles("To do")).toEqual(["soon", "Test it"]);
    // A null value falls back to the representation, `title` by default.
    expect(
      Array.from(
        cardArea("To do").querySelectorAll(
          "[data-slot=kanban-card-description]",
        ),
      ).map((node) => node.textContent),
    ).toEqual(["todo", "todo"]);
  });

  it("shows no description line when its value is empty", async () => {
    mount({ board: { descriptionSource: "note" } });
    await screen.findByText("Write it");

    expect(card("Write it").textContent).toContain("soon");
    expect(
      card("Ship it").querySelector("[data-slot=kanban-card-description]"),
    ).toBeNull();
    expect(
      card("Test it").querySelector("[data-slot=kanban-card-description]"),
    ).toBeNull();
  });

  it("cardRenderer replaces the card content", async () => {
    mount({
      board: {
        cardRenderer: (record: LooseRecord) => (
          <em data-testid="custom">{`#${record.id}`}</em>
        ),
      },
    });
    await screen.findAllByTestId("custom");

    expect(
      screen.getAllByTestId("custom").map((node) => node.textContent),
    ).toEqual(["#1", "#3", "#2"]);
    expect(screen.queryByText("Write it")).toBeNull();
  });

  it("dropping a card on another column calls update with the column id and the previous record", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { notify } = mount({ dataProvider });
    await screen.findByText("Write it");

    await dragTo("Write it", "In progress");

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "doing" },
      previousData: TASKS[0],
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it("the card changes column before the data provider answers", async () => {
    const dataProvider = provider();
    type Updated = Awaited<ReturnType<DataProvider["update"]>>;
    let answer: (value: Updated) => void = () => {};
    vi.spyOn(dataProvider, "update").mockImplementation(
      () =>
        new Promise<Updated>((resolve) => {
          answer = resolve;
        }),
    );
    mount({ dataProvider });
    await screen.findByText("Write it");

    await dragTo("Write it", "In progress");

    await waitFor(() =>
      expect(cardTitles("In progress")).toEqual(["Write it", "Ship it"]),
    );
    expect(cardTitles("To do")).toEqual(["Test it"]);
    answer({
      data: { id: 1, title: "Write it", status: "doing", note: "soon" },
    });
  });

  it("a rejected update puts the card back and notifies an error", async () => {
    const dataProvider = provider();
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("nope"));
    const { notify } = mount({ dataProvider });
    await screen.findByText("Write it");

    await dragTo("Write it", "In progress");

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    await waitFor(() =>
      expect(cardTitles("To do")).toEqual(["Write it", "Test it"]),
    );
    expect(cardTitles("In progress")).toEqual(["Ship it"]);
  });

  it("dropping a card on its own column writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });
    await screen.findByText("Write it");

    await dragTo("Write it", "To do");

    expect(update).not.toHaveBeenCalled();
    expect(cardTitles("To do")).toEqual(["Write it", "Test it"]);
  });

  it("a drag that ends outside a column writes nothing and clears the highlight", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });
    await screen.findByText("Write it");

    await pickUp("Write it");
    await moveOver("Done");
    expect(cardArea("Done").hasAttribute("data-over")).toBe(true);
    // Past the last column nothing is under the pointer.
    pointer(document, "pointermove", { x: 2000, y: 2000 });
    await waitFor(() =>
      expect(cardArea("Done").hasAttribute("data-over")).toBe(false),
    );
    pointer(document, "pointerup", { x: 2000, y: 2000 });
    await settle();

    expect(card("Write it").hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(cardTitles("To do")).toEqual(["Write it", "Test it"]);
  });

  it("marks the held card and the column under it while dragging", async () => {
    mount();
    await screen.findByText("Write it");

    await pickUp("Write it");
    expect(card("Write it").hasAttribute("data-dragging")).toBe(true);

    await moveOver("Done");
    expect(cardArea("Done").hasAttribute("data-over")).toBe(true);
    expect(cardArea("In progress").hasAttribute("data-over")).toBe(false);

    await moveOver("In progress");
    expect(cardArea("Done").hasAttribute("data-over")).toBe(false);
    expect(cardArea("In progress").hasAttribute("data-over")).toBe(true);
  });

  it("a touch drag moves a card to another column", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });
    await screen.findByText("Write it");

    await dragTo("Write it", "Done", "touch");

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "done" },
      previousData: TASKS[0],
    });
  });

  it("a touch that moves before the hold ends scrolls and starts no drag", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });
    await screen.findByText("Write it");

    const from = centre(card("Write it"));
    pointer(card("Write it"), "pointerdown", from, "touch");
    pointer(document, "pointermove", { x: from.x + 40, y: from.y }, "touch");
    await wait(300);
    expect(card("Write it").hasAttribute("data-dragging")).toBe(false);
    pointer(document, "pointerup", insideArea("Done"), "touch");
    await settle();

    expect(update).not.toHaveBeenCalled();
  });

  it("a click on a card selects it and starts no drag", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const onSelectCard = vi.fn();
    mount({ dataProvider, board: { onSelectCard } });
    await screen.findByText("Write it");

    const at = centre(card("Write it"));
    pointer(card("Write it"), "pointerdown", at);
    expect(card("Write it").hasAttribute("data-dragging")).toBe(false);
    pointer(document, "pointerup", at);
    fireEvent.click(card("Write it"));
    await settle();

    expect(onSelectCard).toHaveBeenCalledTimes(1);
    expect(onSelectCard).toHaveBeenCalledWith(TASKS[0]);
    expect(card("Write it").hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("a press on the Move to button starts no drag", async () => {
    mount();
    await screen.findByText("Write it");

    const trigger = within(card("Write it")).getByRole("button", {
      name: "Move Write it",
    });
    const at = centre(card("Write it"));
    pointer(trigger, "pointerdown", at);
    pointer(document, "pointermove", { x: at.x + 40, y: at.y });
    await settle();

    expect(card("Write it").hasAttribute("data-dragging")).toBe(false);
  });

  it("a press on a link in cardRenderer starts no drag", async () => {
    mount({
      board: {
        cardRenderer: (record: LooseRecord) => (
          <a href="#x" data-testid={`link-${record.id}`}>
            {String(record.title)}
          </a>
        ),
      },
    });
    await screen.findByTestId("link-1");

    const at = centre(cardWithId(1));
    pointer(screen.getByTestId("link-1"), "pointerdown", at);
    pointer(document, "pointermove", { x: at.x + 40, y: at.y });
    await settle();

    expect(document.querySelector("[data-dragging]")).toBeNull();
  });

  it("no card carries the native draggable attribute", async () => {
    mount();
    await screen.findByText("Write it");

    for (const node of document.querySelectorAll("[data-slot=kanban-card]")) {
      expect(node.hasAttribute("draggable")).toBe(false);
    }
  });

  it("a card announces as a button, with no drag instructions", async () => {
    mount();
    await screen.findByText("Write it");
    await settle();

    const node = card("Write it");
    expect(node.getAttribute("role")).toBe("button");
    for (const name of [
      "aria-roledescription",
      "aria-describedby",
      "aria-pressed",
      "aria-grabbed",
    ]) {
      expect(node.hasAttribute(name), name).toBe(false);
    }
    expect(document.body.textContent).not.toContain("space bar");
  });

  it("a card is not announced as disabled when edit access is denied", async () => {
    const authProvider = denyEdit();
    mount({ authProvider });
    await screen.findByText("Write it");
    await waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());
    await settle();

    expect(card("Write it").hasAttribute("aria-disabled")).toBe(false);
  });

  it("cards are not draggable when edit access is denied", async () => {
    const authProvider = denyEdit();
    mount({ authProvider });
    await screen.findByText("Write it");
    await waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());

    expect(card("Write it").hasAttribute("data-draggable")).toBe(false);
  });

  it("cards are draggable with edit access", async () => {
    mount();
    await screen.findByText("Write it");

    expect(card("Write it").hasAttribute("data-draggable")).toBe(true);
  });

  it("the Move to menu lists the other columns and moving with the keyboard calls update like a drop", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });
    await screen.findByText("Write it");

    const trigger = within(card("Write it")).getByRole("button", {
      name: "Move Write it",
    });
    expect(trigger.getAttribute("data-slot")).toBe("kanban-card-move");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "In progress",
      "Done",
    ]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Done" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("tasks", {
      id: 1,
      data: { status: "done" },
      previousData: TASKS[0],
    });
    await waitFor(() => expect(cardTitles("Done")).toEqual(["Write it"]));
  });

  it("the Move to button is absent when edit access is denied and does not select the card", async () => {
    const authProvider = denyEdit();
    const onSelectCard = vi.fn();
    mount({ authProvider, board: { onSelectCard } });
    await screen.findByText("Write it");
    await waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();

    cleanup();
    const select = vi.fn();
    mount({ board: { onSelectCard: select } });
    await screen.findByText("Write it");
    const trigger = within(card("Write it")).getByRole("button", {
      name: "Move Write it",
    });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "In progress" }),
    );

    expect(select).not.toHaveBeenCalled();
  });

  it("onSelectCard receives the record when a card is clicked or Enter is pressed", async () => {
    const onSelectCard = vi.fn();
    mount({ board: { onSelectCard } });
    await screen.findByText("Write it");

    fireEvent.click(card("Write it"));
    expect(onSelectCard).toHaveBeenLastCalledWith(TASKS[0]);
    fireEvent.keyDown(card("Ship it"), { key: "Enter" });
    expect(onSelectCard).toHaveBeenLastCalledWith(TASKS[1]);
    fireEvent.keyDown(card("Test it"), { key: " " });
    expect(onSelectCard).toHaveBeenLastCalledWith(TASKS[2]);
    expect(onSelectCard).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("path").textContent).toBe("/tasks");
  });

  it("a card opens the edit page, or the show page when there is no edit view", async () => {
    mount();
    await screen.findByText("Write it");
    fireEvent.click(card("Write it"));
    expect(screen.getByTestId("path").textContent).toBe("/tasks/1");

    cleanup();
    mount({ edit: false });
    await screen.findByText("Write it");
    fireEvent.keyDown(card("Ship it"), { key: "Enter" });
    expect(screen.getByTestId("path").textContent).toBe("/tasks/2/show");
  });

  it("linkType false leaves cards inert", async () => {
    mount({ board: { linkType: false } });
    await screen.findByText("Write it");

    fireEvent.click(card("Write it"));
    fireEvent.keyDown(card("Write it"), { key: "Enter" });

    expect(screen.getByTestId("path").textContent).toBe("/tasks");
  });

  it("renders a title and description that hold markup as text", async () => {
    const markup = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    mount({
      dataProvider: fakeDataProvider({
        tasks: [{ id: 1, title: markup, status: "todo", note: script }],
      }),
      board: { titleSource: "title", descriptionSource: "note" },
    });
    await screen.findByText(markup);

    expect(screen.getByText(script)).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("a drag that starts inside a card writes nothing when edit access is denied", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const authProvider = denyEdit();
    mount({
      dataProvider,
      authProvider,
      board: {
        cardRenderer: (record: LooseRecord) => (
          <a href="#x" data-testid={`link-${record.id}`}>
            {String(record.title)}
          </a>
        ),
      },
    });
    await screen.findByTestId("link-1");
    await waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());

    const at = centre(cardWithId(1));
    pointer(screen.getByTestId("link-1"), "pointerdown", at);
    pointer(document, "pointermove", { x: at.x + 10, y: at.y });
    pointer(document, "pointermove", insideArea("Done"));
    await settle();
    pointer(document, "pointerup", insideArea("Done"));
    await settle();

    expect(document.querySelector("[data-dragging]")).toBeNull();
    expect(cardArea("Done").hasAttribute("data-over")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("names the Move to button in plain text when the representation is an element", async () => {
    mount({
      dataProvider: fakeDataProvider({
        tasks: [{ id: 1, title: "Write it", status: "todo" }],
      }),
      resourceProps: {
        recordRepresentation: (record) => (
          <b>{String(getAtPath(record, "title"))}</b>
        ),
      },
    });
    await screen.findByText("Write it");

    expect(screen.getByRole("button", { name: "Move Write it" })).toBeTruthy();
  });
});
