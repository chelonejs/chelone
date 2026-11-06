import { type BlockDocNode, isBlockDoc } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  doc,
  mountBlockEditor,
  paragraph,
  stubLayout,
  type Values,
} from "./__fixtures__/block-editor-harness";
import { defineBlock, NodeViewContent } from "./block-nodes";

beforeAll(stubLayout);
afterEach(() => cleanup());

const note = defineBlock({
  name: "note",
  label: "Note",
  group: "Text",
  schema: z.object({
    tone: z.enum(["info", "warn"]).default("info"),
    pinned: z.boolean().default(false),
    size: z.number().nullable().default(1),
    title: z.string().default(""),
    extra: z.object({ a: z.string() }).default({ a: "" }),
  }),
  config: "auto",
  render: ({ attrs }) => <aside>{attrs.title}</aside>,
});

const plain = defineBlock({
  name: "plain",
  label: "Plain",
  group: "Text",
  schema: z.object({ title: z.string().default("") }),
  render: ({ attrs }) => <aside>{attrs.title}</aside>,
});

const custom = defineBlock({
  name: "custom",
  label: "Custom",
  group: "Text",
  schema: z.object({ text: z.string().default("") }),
  config: ({ attrs, onChange }) => (
    <button type="button" onClick={() => onChange({ text: "patched" })}>
      Patch {attrs.text === "" ? "empty" : attrs.text}
    </button>
  ),
  render: ({ attrs }) => <aside>{attrs.text}</aside>,
});

const box = defineBlock({
  name: "box",
  label: "Box",
  group: "Text",
  schema: z.object({ title: z.string().default("") }),
  content: "block+",
  render: ({ attrs }) => (
    <aside>
      {attrs.title}
      <NodeViewContent />
    </aside>
  ),
});

const blocks = [note, plain, custom, box];

const noteAttrs = {
  tone: "info",
  pinned: false,
  size: 1,
  title: "",
  extra: { a: "" },
};
const titled = (type: string, title: string): BlockDocNode => ({
  type,
  attrs: type === "note" ? { ...noteAttrs, title } : { title },
});

async function mount(...content: BlockDocNode[]) {
  const onData = vi.fn<(data: Values) => void>();
  const mounted = await mountBlockEditor(
    { blocks },
    { defaultValues: { body: doc(...content) }, onData },
  );
  return { ...mounted, onData };
}

type Mounted = Awaited<ReturnType<typeof mount>>;

const select = (editor: Mounted["editor"], index: number) => {
  const { doc: root } = editor().state;
  let pos = 0;
  for (let i = 0; i < index; i++) pos += root.child(i).nodeSize;
  act(() => {
    editor().commands.setNodeSelection(pos);
  });
};

const written = (mounted: Mounted) => {
  const body = mounted.onData.mock.calls.at(-1)?.[0]?.body;
  const content = isBlockDoc(body) ? body.content : undefined;
  // StarterKit keeps an empty paragraph after a last block.
  const last = content?.at(-1);
  return last?.type === "paragraph" && last.content === undefined
    ? content?.slice(0, -1)
    : content;
};

const titles = (content: BlockDocNode[] | undefined) =>
  (content ?? []).map((node) => node.attrs?.title ?? node.type);

const button = (name: string) =>
  elementOf(screen.getByRole("button", { name }), HTMLButtonElement);

describe("<BlockToolbar>", () => {
  it("shows only while a block is selected and the editor is editable", async () => {
    const editable = await mount(paragraph("First"), titled("plain", "A"));
    expect(screen.queryByRole("toolbar")).toBeNull();

    select(editable.editor, 1);
    const bar = screen.getByRole("toolbar");
    expect(bar.getAttribute("data-slot")).toBe("block-toolbar");

    act(() => {
      editable.editor().commands.setTextSelection(2);
    });
    expect(screen.queryByRole("toolbar")).toBeNull();
    cleanup();

    const readOnly = await mountBlockEditor(
      { blocks, readOnly: true },
      {
        defaultValues: { body: doc(paragraph("First"), titled("plain", "A")) },
      },
    );
    select(readOnly.editor, 1);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("offers Configure only for a block that has a config", async () => {
    const mounted = await mount(titled("plain", "A"), titled("note", "B"));
    select(mounted.editor, 0);
    expect(screen.queryByRole("button", { name: "Configure" })).toBeNull();
    select(mounted.editor, 1);
    expect(screen.getByRole("button", { name: "Configure" })).toBeTruthy();
  });

  it("duplicate inserts a copy after the block", async () => {
    const mounted = await mount(
      titled("note", "A"),
      paragraph("Between"),
      titled("plain", "B"),
    );
    select(mounted.editor, 0);
    fireEvent.click(button("Duplicate"));
    await mounted.submit();
    expect(written(mounted)).toEqual([
      titled("note", "A"),
      titled("note", "A"),
      paragraph("Between"),
      titled("plain", "B"),
    ]);
  });

  it("move up and move down swap the block with its sibling", async () => {
    const mounted = await mount(
      titled("plain", "A"),
      titled("plain", "B"),
      titled("plain", "C"),
    );
    select(mounted.editor, 0);
    fireEvent.click(button("Move down"));
    await mounted.submit();
    expect(titles(written(mounted))).toEqual(["B", "A", "C"]);

    // The moved block stays selected, so the bar can move it again.
    fireEvent.click(button("Move down"));
    await mounted.submit();
    expect(titles(written(mounted))).toEqual(["B", "C", "A"]);

    fireEvent.click(button("Move up"));
    await mounted.submit();
    expect(titles(written(mounted))).toEqual(["B", "A", "C"]);
  });

  it("move up is disabled for the first sibling and move down for the last", async () => {
    const mounted = await mount({
      type: "box",
      attrs: { title: "Box" },
      content: [titled("plain", "A"), titled("plain", "B")],
    });
    // 0 is the box, 1 its first child.
    act(() => {
      mounted.editor().commands.setNodeSelection(1);
    });
    expect(button("Move up").disabled).toBe(true);
    expect(button("Move down").disabled).toBe(false);

    const second =
      1 + (mounted.editor().state.doc.firstChild?.child(0).nodeSize ?? 0);
    act(() => {
      mounted.editor().commands.setNodeSelection(second);
    });
    expect(button("Move up").disabled).toBe(false);
    expect(button("Move down").disabled).toBe(true);
  });

  it("delete removes the block", async () => {
    const mounted = await mount(
      titled("plain", "A"),
      titled("plain", "B"),
      titled("plain", "C"),
    );
    select(mounted.editor, 1);
    fireEvent.click(button("Delete"));
    await mounted.submit();
    expect(titles(written(mounted))).toEqual(["A", "C"]);
  });

  it("acts on the block that holds the caret, as well as on a selected block", async () => {
    const box: BlockDocNode = {
      type: "box",
      attrs: { title: "Boxed" },
      content: [paragraph("Inside")],
    };
    const mounted = await mount(paragraph("Before"), box);
    expect(screen.queryByRole("toolbar")).toBeNull();
    // Inside the box's paragraph: 7 is the box, 8 its paragraph, 9 the first letter.
    act(() => {
      mounted.editor().commands.setTextSelection(10);
    });
    expect(screen.getByRole("toolbar")).toBeTruthy();
    fireEvent.click(button("Duplicate"));
    await mounted.submit();
    expect(written(mounted)).toEqual([paragraph("Before"), box, box]);
  });

  it("the auto config form writes an enum, a boolean, a number and a string", async () => {
    const mounted = await mount(titled("note", "A"));
    select(mounted.editor, 0);
    fireEvent.click(screen.getByRole("button", { name: "Configure" }));
    const panel = defined(document.querySelector('[data-slot="block-config"]'));
    expect(panel.getAttribute("data-slot")).toBe("block-config");

    fireEvent.change(screen.getByRole("combobox", { name: "Tone" }), {
      target: { value: "warn" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Pinned" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Size" }), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Hello" },
    });
    // A key the form cannot edit gets no control.
    expect(screen.queryByText("Extra")).toBeNull();

    await mounted.submit();
    expect(written(mounted)).toEqual([
      {
        type: "note",
        attrs: {
          tone: "warn",
          pinned: true,
          size: 3,
          title: "Hello",
          extra: { a: "" },
        },
      },
    ]);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Size" }), {
      target: { value: "" },
    });
    await mounted.submit();
    expect(written(mounted)?.[0]?.attrs?.size).toBeNull();
  });

  it("Configure toggles the panel", async () => {
    const mounted = await mount(titled("note", "A"));
    select(mounted.editor, 0);
    const panel = () => document.querySelector('[data-slot="block-config"]');
    expect(panel()).toBeNull();
    fireEvent.click(button("Configure"));
    expect(panel()).not.toBeNull();
    fireEvent.click(button("Configure"));
    expect(panel()).toBeNull();
  });

  it("a custom config component patches the attributes", async () => {
    const mounted = await mount({ type: "custom", attrs: { text: "" } });
    select(mounted.editor, 0);
    fireEvent.click(button("Configure"));
    fireEvent.click(screen.getByRole("button", { name: "Patch empty" }));
    expect(screen.getByRole("button", { name: "Patch patched" })).toBeTruthy();
    await mounted.submit();
    expect(written(mounted)).toEqual([
      { type: "custom", attrs: { text: "patched" } },
    ]);
  });
});
