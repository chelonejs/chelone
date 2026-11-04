/**
 * `<KanbanBoard>`: the records of the ambient `<List>` as columns. Mounted as
 * `<MemoryRouter><Admin><Resource list edit show/></Admin></MemoryRouter>`;
 * assertions are on DOM, roles and data-provider calls. Drag events are fired
 * with a stub `dataTransfer`, since jsdom has none.
 */
import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin/admin";
import { Resource } from "../../../resource";
import { List } from "../views/list";
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
const cardArea = (label: string) =>
  column(label).querySelector<HTMLElement>(
    "[data-slot=kanban-column-cards]",
  ) as HTMLElement;

/** jsdom drops `relatedTarget` from a drag event's init, so it is set by hand. */
function dragLeave(target: Element, relatedTarget: Element | null) {
  const event = createEvent.dragLeave(target);
  Object.defineProperty(event, "relatedTarget", { value: relatedTarget });
  fireEvent(target, event);
}

function stubTransfer() {
  return { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };
}

/** Pick a card up and drop it on a column's card area. */
function dragTo(title: string, label: string) {
  const dataTransfer = stubTransfer();
  fireEvent.dragStart(card(title), { dataTransfer });
  fireEvent.dragOver(cardArea(label), { dataTransfer });
  fireEvent.drop(cardArea(label), { dataTransfer });
  fireEvent.dragEnd(card(title), { dataTransfer });
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

    dragTo("Write it", "In progress");

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
    let answer: (value: unknown) => void = () => {};
    vi.spyOn(dataProvider, "update").mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }) as never,
    );
    mount({ dataProvider });
    await screen.findByText("Write it");

    dragTo("Write it", "In progress");

    await waitFor(() =>
      expect(cardTitles("In progress")).toEqual(["Write it", "Ship it"]),
    );
    expect(cardTitles("To do")).toEqual(["Test it"]);
    answer({ data: { ...TASKS[0], status: "doing" } });
  });

  it("a rejected update puts the card back and notifies an error", async () => {
    const dataProvider = provider();
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("nope"));
    const { notify } = mount({ dataProvider });
    await screen.findByText("Write it");

    dragTo("Write it", "In progress");

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

    dragTo("Write it", "To do");

    expect(update).not.toHaveBeenCalled();
    expect(cardTitles("To do")).toEqual(["Write it", "Test it"]);
  });

  it("a drag that ends outside a column writes nothing and clears the highlight", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });
    await screen.findByText("Write it");

    const dataTransfer = stubTransfer();
    fireEvent.dragStart(card("Write it"), { dataTransfer });
    fireEvent.dragOver(cardArea("Done"), { dataTransfer });
    expect(cardArea("Done").hasAttribute("data-over")).toBe(true);
    fireEvent.dragEnd(card("Write it"), { dataTransfer });

    expect(cardArea("Done").hasAttribute("data-over")).toBe(false);
    expect(card("Write it").hasAttribute("data-dragging")).toBe(false);
    expect(update).not.toHaveBeenCalled();
    // With nothing held, a column takes no drop.
    const over = fireEvent.dragOver(cardArea("Done"), { dataTransfer });
    expect(over).toBe(true);
  });

  it("marks the held card and the column under it while dragging", async () => {
    mount();
    await screen.findByText("Write it");

    const dataTransfer = stubTransfer();
    fireEvent.dragStart(card("Write it"), { dataTransfer });
    expect(dataTransfer.effectAllowed).toBe("move");
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "1");
    expect(card("Write it").hasAttribute("data-dragging")).toBe(true);

    const notCancelled = fireEvent.dragOver(cardArea("Done"), { dataTransfer });
    expect(notCancelled).toBe(false);
    expect(dataTransfer.dropEffect).toBe("move");
    expect(cardArea("Done").hasAttribute("data-over")).toBe(true);

    // Moving onto a child of the area is not leaving it.
    dragLeave(cardArea("To do"), card("Test it"));
    fireEvent.dragOver(cardArea("To do"), { dataTransfer });
    dragLeave(cardArea("To do"), card("Test it"));
    expect(cardArea("To do").hasAttribute("data-over")).toBe(true);
    dragLeave(cardArea("To do"), document.body);
    expect(cardArea("To do").hasAttribute("data-over")).toBe(false);
  });

  it("cards are not draggable when edit access is denied", async () => {
    const authProvider = denyEdit();
    mount({ authProvider });
    await screen.findByText("Write it");
    await waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());

    expect(card("Write it").getAttribute("draggable")).toBe("false");
  });

  it("cards are draggable with edit access", async () => {
    mount();
    await screen.findByText("Write it");

    expect(card("Write it").getAttribute("draggable")).toBe("true");
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
    fireEvent.click(items[1] as HTMLElement);

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
    const items = await screen.findAllByRole("menuitem");
    fireEvent.click(items[0] as HTMLElement);

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

    const dataTransfer = stubTransfer();
    fireEvent.dragStart(screen.getByTestId("link-1"), { dataTransfer });
    fireEvent.dragOver(cardArea("Done"), { dataTransfer });
    fireEvent.drop(cardArea("Done"), { dataTransfer });

    expect(dataTransfer.setData).not.toHaveBeenCalled();
    expect(cardArea("Done").hasAttribute("data-over")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("names the Move to button in plain text when the representation is an element", async () => {
    mount({
      dataProvider: fakeDataProvider({
        tasks: [{ id: 1, title: "Write it", status: "todo" }],
      }),
      resourceProps: {
        recordRepresentation: (record: LooseRecord) => (
          <b>{String(record.title)}</b>
        ),
      },
    });
    await screen.findByText("Write it");

    expect(screen.getByRole("button", { name: "Move Write it" })).toBeTruthy();
  });
});
