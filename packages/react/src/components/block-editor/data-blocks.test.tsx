import {
  type BlockAttrs,
  createResourceRegistry,
  fakeDataProvider,
  isBlockDoc,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  doc,
  mountBlockEditor,
  stubLayout,
  type Values,
} from "./__fixtures__/block-editor-harness";
import { dataBlocks } from "./data-blocks";
import { calloutBlock } from "./default-blocks";

beforeAll(stubLayout);
afterEach(() => cleanup());

const posts = [
  { id: 1, title: "Hello", status: "draft", views: 12, author: "Ada" },
  { id: 2, title: "Second", status: "live", views: 3, author: "Bo" },
  { id: 3, title: "Third", status: "live", views: 7, author: "Cy" },
];

function registryOf(...names: string[]) {
  const registry = createResourceRegistry();
  for (const name of names) {
    registry.register({
      name,
      hasList: true,
      hasCreate: false,
      hasEdit: false,
      hasShow: false,
    });
  }
  return registry;
}

async function mount(
  type: string,
  attrs: BlockAttrs,
  tables: Parameters<typeof fakeDataProvider>[0] = { posts },
) {
  const onData = vi.fn<(data: Values) => void>();
  const mounted = await mountBlockEditor(
    { blocks: dataBlocks },
    {
      defaultValues: { body: doc({ type, attrs }) },
      dataProvider: fakeDataProvider(tables),
      registry: registryOf("posts", "users"),
      onData,
    },
  );
  return { ...mounted, onData };
}

describe("data blocks", () => {
  it("a reference record shows the record's title and fields", async () => {
    await mount("referenceRecord", {
      resource: "posts",
      id: 1,
      fields: ["status", "views"],
      layout: "card",
    });
    expect(await screen.findByText("Hello")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("draft")).toBeTruthy();
    expect(screen.getByText("Views")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.queryByText("Ada")).toBeNull();
  });

  it("a reference record shows the empty state until configured, and the error state for a missing record", async () => {
    await mount("referenceRecord", { resource: "posts" });
    expect(screen.getByText("Choose a resource and a record id")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();

    await mount("referenceRecord", { resource: "posts", id: 99 });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("The record could not be loaded");
  });

  it("a reference record in the inline layout shows the title alone in a badge", async () => {
    await mount("referenceRecord", {
      resource: "posts",
      id: 2,
      fields: ["status"],
      layout: "inline",
    });
    const badge = await screen.findByText("Second");
    expect(badge.getAttribute("data-slot")).toBe("badge");
    expect(screen.queryByText("Status")).toBeNull();
  });

  it("a record list shows perPage rows of the resource", async () => {
    await mount("recordList", { resource: "posts", perPage: 2 });
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row");
    // The header and two of the three records, with three columns after `id`.
    expect(rows).toHaveLength(3);
    expect(
      within(defined(rows[0]))
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Title", "Status", "Views"]);
    expect(
      within(defined(rows[1]))
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["Hello", "draft", "12"]);
    expect(within(table).queryByText("Third")).toBeNull();
  });

  it("a record list shows only the fields it is given", async () => {
    await mount("recordList", {
      resource: "posts",
      perPage: 5,
      fields: ["author", "title"],
    });
    const table = await screen.findByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Author", "Title"]);
    expect(within(table).getAllByRole("row")).toHaveLength(4);
  });

  it("the config picks a resource from the registered resources", async () => {
    const { editor, submit, onData } = await mount("recordList", {
      resource: "",
      perPage: 5,
    });
    act(() => {
      editor().commands.setNodeSelection(0);
    });
    fireEvent.click(await screen.findByRole("button", { name: "Configure" }));

    const select = elementOf(
      screen.getByRole("combobox", { name: "Resource" }),
      HTMLSelectElement,
    );
    expect([...select.options].map((option) => option.value)).toEqual([
      "",
      "posts",
      "users",
    ]);
    fireEvent.change(select, { target: { value: "users" } });
    await submit();

    const body = onData.mock.calls.at(-1)?.[0]?.body;
    const first = isBlockDoc(body) ? body.content?.[0] : undefined;
    expect(first?.attrs).toMatchObject({ resource: "users", perPage: 5 });
  });

  it("the config writes the fields as a list and the id as given", async () => {
    const { editor, submit, onData } = await mount("referenceRecord", {
      resource: "posts",
      id: 1,
    });
    act(() => {
      editor().commands.setNodeSelection(0);
    });
    fireEvent.click(await screen.findByRole("button", { name: "Configure" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Fields" }), {
      target: { value: "status, views," },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Record id" }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Layout" }), {
      target: { value: "inline" },
    });
    await submit();

    const body = onData.mock.calls.at(-1)?.[0]?.body;
    const first = isBlockDoc(body) ? body.content?.[0] : undefined;
    expect(first?.attrs).toMatchObject({
      resource: "posts",
      id: "2",
      fields: ["status", "views"],
      layout: "inline",
    });
  });

  it("record values with markup render as text", async () => {
    const markup = "<img src=x onerror=alert(1)>";
    const tables = { posts: [{ id: 1, title: markup, status: markup }] };
    await mount(
      "referenceRecord",
      { resource: "posts", id: 1, fields: ["status"] },
      tables,
    );
    expect((await screen.findAllByText(markup)).length).toBe(2);
    expect(document.querySelector("img")).toBeNull();
    cleanup();

    await mount("recordList", { resource: "posts", perPage: 5 }, tables);
    expect((await screen.findAllByText(markup)).length).toBe(2);
    expect(document.querySelector("img")).toBeNull();
  });

  it("data blocks are not offered unless listed in blocks", async () => {
    const offered = async (blocks: typeof dataBlocks) => {
      const { editor } = await mountBlockEditor({ blocks });
      act(() => {
        editor().commands.focus();
        editor().commands.insertContent("/");
      });
      const list = await screen.findByRole("listbox");
      const names = within(list)
        .getAllByRole("option")
        .map((option) => option.textContent ?? "");
      cleanup();
      return names;
    };

    const without = await offered([calloutBlock]);
    expect(without.some((name) => name.includes("Reference record"))).toBe(
      false,
    );
    expect(without.some((name) => name.includes("Chart"))).toBe(false);

    const withData = await offered(dataBlocks);
    expect(withData).toEqual([
      expect.stringContaining("Reference record"),
      expect.stringContaining("Record list"),
      expect.stringContaining("Chart"),
    ]);
  });
});
