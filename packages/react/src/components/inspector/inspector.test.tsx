/**
 * The inspector add-on mounted the way an app does: `<Inspector>` wrapping
 * `<Layout>` in the `Admin.Layout` slot, under a real `<Admin>`. Assertions are
 * on DOM, roles and the store; jsdom applies no CSS, so nothing here checks
 * styling or what hover shows.
 */

import {
  createI18n,
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
import { type ReactNode, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Admin,
  ColumnsButton,
  DataTable,
  Layout,
  List,
  Resource,
} from "../../index";
import { Configurable } from "./configurable";
import { Inspector } from "./inspector";
import { InspectorButton } from "./inspector-button";
import { SortableFieldsSelector } from "./sortable-fields-selector";

afterEach(cleanup);

beforeEach(() => {
  window.innerWidth = 1024;
  window.innerHeight = 768;
});

interface MountOptions {
  page: ReactNode;
  /** Mount without an `<Inspector>` around the layout. */
  inspector?: boolean;
  store?: ReturnType<typeof createStore>;
}

function mount({
  page,
  inspector = true,
  store = createStore(),
}: MountOptions) {
  function AppLayout({ children }: { children?: ReactNode }) {
    return inspector ? (
      <Inspector>
        <Layout>{children}</Layout>
      </Inspector>
    ) : (
      <Layout>{children}</Layout>
    );
  }
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={fakeDataProvider({ posts: [{ id: 1, title: "Alpha" }] })}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={createI18n({ locale: "en", messages: { en: {} } })}
        store={store}
      >
        <Admin.Layout>
          <AppLayout />
        </Admin.Layout>
        <Resource name="posts" list={() => page} />
      </Admin>
    </MemoryRouter>,
  );
  return { store };
}

const modeButton = () =>
  screen.findByRole("button", { name: "Configure mode" });
const panel = () => screen.queryByRole("dialog");

describe("<InspectorButton>", () => {
  it("toggles configure mode and reports it with aria-pressed", async () => {
    mount({ page: <InspectorButton /> });
    const button = await modeButton();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(panel()).toBeNull();

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(panel()).not.toBeNull();

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(panel()).toBeNull();
  });

  it("does not toggle when onClick prevents the default", async () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) =>
      event.preventDefault(),
    );
    mount({ page: <InspectorButton onClick={onClick} /> });
    const button = await modeButton();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(panel()).toBeNull();
  });

  it("renders nothing without an Inspector", async () => {
    mount({
      page: (
        <>
          <InspectorButton />
          <span>page ready</span>
        </>
      ),
      inspector: false,
    });
    await screen.findByText("page ready");
    expect(screen.queryByRole("button", { name: "Configure mode" })).toBeNull();
  });
});

describe("<Inspector>", () => {
  it("shows the hint while nothing is selected and closes with the Close button", async () => {
    mount({ page: <InspectorButton /> });
    fireEvent.click(await modeButton());

    const dialog = screen.getByRole("dialog", { name: "Inspector" });
    expect(
      within(dialog).getByText("Pick an outlined element to configure it"),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(panel()).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Configure mode" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("dragging the header stores a clamped position", async () => {
    const { store } = mount({ page: <InspectorButton /> });
    fireEvent.click(await modeButton());
    const dialog = screen.getByRole("dialog");
    const handle = within(dialog)
      .getByText("Inspector")
      .closest("[data-slot=inspector-handle]");
    if (!handle) throw new Error("no handle");
    // The top right corner of a 1024 px window: 1024 - 320 - 8.
    expect(dialog.style.left).toBe("696px");
    expect(dialog.style.top).toBe("8px");

    const at = (type: string, x: number, y: number) =>
      fireEvent(
        type === "pointerdown" ? handle : window,
        new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          button: 0,
        }),
      );
    at("pointerdown", 700, 20);
    at("pointermove", 500, 100);
    expect(dialog.style.left).toBe("496px");
    expect(dialog.style.top).toBe("88px");
    // Nothing is stored until the button is released.
    expect(store.getItem(inspectorPositionKey)).toBeUndefined();

    at("pointermove", -900, 5000);
    at("pointerup", -900, 5000);
    // Clamped to the margin on the left and a handle's height above the bottom.
    expect(store.getItem(inspectorPositionKey)).toEqual({ x: 8, y: 720 });
    expect(dialog.style.left).toBe("8px");
    expect(dialog.style.top).toBe("720px");
  });

  it("the arrow keys move the panel and store its position", async () => {
    const { store } = mount({ page: <InspectorButton /> });
    fireEvent.click(await modeButton());
    const dialog = screen.getByRole("dialog");
    const handle = dialog.querySelector("[data-slot=inspector-handle]");
    if (!handle) throw new Error("no handle");
    expect(handle.getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(store.getItem(inspectorPositionKey)).toEqual({ x: 680, y: 8 });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(store.getItem(inspectorPositionKey)).toEqual({ x: 680, y: 24 });
    expect(dialog.style.left).toBe("680px");
    expect(dialog.style.top).toBe("24px");
  });

  it("clamps a stored position that no longer fits the window", async () => {
    const store = createStore();
    store.setItem(inspectorPositionKey, { x: 900, y: 600 });
    mount({ page: <InspectorButton />, store });
    fireEvent.click(await modeButton());
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.left).toBe("696px");

    window.innerWidth = 600;
    fireEvent(window, new Event("resize"));
    expect(dialog.style.left).toBe("272px");
  });
});

function Toggled({ label, editor }: { label: string; editor: string }) {
  const [shown, setShown] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShown(false)}>
        Remove {label}
      </button>
      {shown ? (
        <Configurable
          preferenceKey={label}
          title={label}
          editor={<p>{editor}</p>}
        >
          <span>{label} content</span>
        </Configurable>
      ) : null}
    </>
  );
}

describe("<Configurable>", () => {
  it("renders only its children without an Inspector", async () => {
    mount({
      page: (
        <Configurable preferenceKey="a" editor={<p>editor</p>}>
          <span>child</span>
        </Configurable>
      ),
      inspector: false,
    });
    const child = await screen.findByText("child");
    expect(child.parentElement?.hasAttribute("data-slot")).toBe(false);
    expect(document.querySelector("[data-slot=configurable]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Customize" })).toBeNull();
  });

  it("keeps its children mounted when configure mode turns on", async () => {
    mount({
      page: (
        <>
          <InspectorButton />
          <Configurable preferenceKey="a" editor={<p>editor</p>}>
            <input aria-label="inner" />
          </Configurable>
        </>
      ),
    });
    const input = await screen.findByLabelText("inner");
    const wrapper = input.closest("[data-slot=configurable]");
    expect(wrapper?.hasAttribute("data-inspector-enabled")).toBe(false);
    expect(screen.queryByRole("button", { name: "Customize" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Configure mode" }));
    expect(screen.getByLabelText("inner")).toBe(input);
    expect(input.closest("[data-slot=configurable]")).toBe(wrapper);
    expect(wrapper?.hasAttribute("data-inspector-enabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Customize" })).toBeTruthy();
  });

  it("Customize opens its editor in the panel with its title", async () => {
    mount({
      page: (
        <>
          <InspectorButton />
          <Configurable
            preferenceKey="a"
            title="Post header"
            editor={<p>header editor</p>}
          >
            <span>header</span>
          </Configurable>
        </>
      ),
    });
    fireEvent.click(await modeButton());
    fireEvent.click(screen.getByRole("button", { name: "Customize" }));

    const dialog = screen.getByRole("dialog", { name: "Post header" });
    expect(within(dialog).getByText("header editor")).toBeTruthy();
    expect(
      within(dialog).queryByText("Pick an outlined element to configure it"),
    ).toBeNull();
    expect(
      document
        .querySelector("[data-slot=configurable]")
        ?.hasAttribute("data-selected"),
    ).toBe(true);
  });

  it("unmounting the selected one empties the panel, and unmounting another does not", async () => {
    mount({
      page: (
        <>
          <InspectorButton />
          <Toggled label="First" editor="first editor" />
          <Toggled label="Second" editor="second editor" />
        </>
      ),
    });
    fireEvent.click(await modeButton());
    const customize = screen.getAllByRole("button", { name: "Customize" });
    fireEvent.click(defined(customize[1]));
    expect(screen.getByText("second editor")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove First" }));
    expect(screen.getByText("second editor")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove Second" }));
    expect(screen.queryByText("second editor")).toBeNull();
    expect(
      screen.getByText("Pick an outlined element to configure it"),
    ).toBeTruthy();
  });

  it("a title with markup renders as text", async () => {
    const title = "<img src=x onerror=alert(1)>";
    mount({
      page: (
        <>
          <InspectorButton />
          <Configurable preferenceKey="a" title={title} editor={<p>e</p>}>
            <span>child</span>
          </Configurable>
        </>
      ),
    });
    fireEvent.click(await modeButton());
    fireEvent.click(screen.getByRole("button", { name: "Customize" }));

    const dialog = screen.getByRole("dialog", { name: title });
    expect(within(dialog).getByText(title)).toBeTruthy();
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
  stubAnimations();
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
const col = (source: string) => <DataTable.Col key={source} source={source} />;
const columns = [col("title"), col("views"), col("author")];
const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent);
const rowLabels = () =>
  Array.from(document.querySelectorAll("[data-slot=fields-selector-row]")).map(
    (row) => row.querySelector("[role=switch]")?.getAttribute("aria-label"),
  );
const grip = (index: number) =>
  defined(screen.getAllByRole("button", { name: "Drag to reorder" })[index]);
/** Real time outside `act`, which holds back the renders dnd-kit waits for. */
const wait = (ms: number) =>
  getConfig().asyncWrapper(
    () => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  );
const centre = (el: Element) => {
  const { x, y, width, height } = rectOf(el);
  return { x: x + width / 2, y: y + height / 2 };
};
const pointer = (
  target: Element | Document,
  type: "pointerdown" | "pointermove" | "pointerup",
  at: { x: number; y: number },
) =>
  fireEvent(
    target,
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

describe("<SortableFieldsSelector>", () => {
  beforeEach(stubDragDom);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("dragging a row onto another moves the column", async () => {
    mount({
      page: (
        <List>
          <SortableFieldsSelector storeKey={STORE_KEY} resource="posts" />
          <DataTable>{columns}</DataTable>
        </List>
      ),
    });
    await screen.findAllByRole("columnheader");
    expect(headers()).toEqual(["Title", "Views", "Author"]);

    const from = centre(grip(0));
    pointer(grip(0), "pointerdown", from);
    pointer(document, "pointermove", { x: from.x + 10, y: from.y });
    await waitFor(() =>
      expect(document.querySelector("[data-dragging]")).not.toBeNull(),
    );
    // Over the last row, off its exact centre: a zero distance has no ranking.
    const over = { x: 150, y: 2 * ROW_HEIGHT + 30 };
    pointer(document, "pointermove", over);
    // dnd-kit ranks the targets on a later frame, so the drop waits for it.
    await wait(100);
    pointer(document, "pointerup", over);

    await waitFor(() =>
      expect(headers()).toEqual(["Views", "Author", "Title"]),
    );
    expect(rowLabels()).toEqual(["Views", "Author", "Title"]);
  });

  it("a ColumnsButton and a SortableFieldsSelector in the panel stay in step", async () => {
    mount({
      page: (
        <List>
          <InspectorButton />
          <ColumnsButton resource="posts" />
          <Configurable
            preferenceKey="columns"
            title="Columns panel"
            editor={<SortableFieldsSelector storeKey={STORE_KEY} />}
          >
            <DataTable>{columns}</DataTable>
          </Configurable>
        </List>
      ),
    });
    fireEvent.click(await modeButton());
    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    const inPanel = within(
      screen.getByRole("dialog", { name: "Columns panel" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const popover = await screen.findAllByRole("dialog");
    const inPopover = within(
      popover.find((d) => d.getAttribute("aria-label") !== "Columns panel") ??
        document.body,
    );

    fireEvent.click(inPopover.getByRole("switch", { name: "Views" }));
    expect(headers()).toEqual(["Title", "Author"]);
    expect(
      inPanel
        .getByRole("switch", { name: "Views" })
        .getAttribute("aria-checked"),
    ).toBe("false");

    // Views is hidden but still listed, so Title moves past it.
    fireEvent.click(inPanel.getByRole("button", { name: "Move down Title" }));
    const order = (scope: ReturnType<typeof within>): (string | null)[] =>
      scope
        .getAllByRole("switch")
        .map((node: HTMLElement) => node.getAttribute("aria-label"));
    await waitFor(() =>
      expect(order(inPopover)).toEqual(["Views", "Title", "Author"]),
    );
    expect(order(inPanel)).toEqual(["Views", "Title", "Author"]);
  });
});
