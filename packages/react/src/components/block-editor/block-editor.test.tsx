import { type BlockDocNode, required } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mountUnderForm } from "../rich-text-input/__fixtures__/rich-text-harness";
import { BlockDocField } from "./block-doc-field";
import {
  BlockEditorInput,
  type BlockEditorInputProps,
} from "./block-editor-input";
import { defineBlock } from "./block-nodes";

// ProseMirror measures the DOM while it scrolls the selection into view,
// which jsdom has no layout for.
beforeAll(() => {
  const rect = new DOMRect(0, 0, 0, 0);
  const rects = Object.assign([], { item: () => null });
  Range.prototype.getClientRects = () => rects;
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.getClientRects = () => rects;
  document.elementFromPoint = () => null;
});

afterEach(() => cleanup());

const callout = defineBlock({
  name: "callout",
  label: "Callout",
  group: "Text",
  keywords: ["note", "alert"],
  description: "Highlight a note",
  schema: z.object({
    tone: z.enum(["info", "warn"]).default("info"),
    text: z.string().default(""),
  }),
  render: ({ attrs, mode }) => (
    <aside data-testid="callout" data-mode={mode} data-tone={attrs.tone}>
      {attrs.text}
    </aside>
  ),
  read: ({ attrs }) => (
    <aside data-testid="callout-read">Read: {attrs.text}</aside>
  ),
});

const counter = defineBlock({
  name: "counter",
  label: "Counter",
  group: "Data",
  schema: z.object({ start: z.number().default(0) }),
  render: ({ attrs }) => <span>Count from {attrs.start}</span>,
});

const blocks = [callout, counter];

const paragraph = (text: string): BlockDocNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const doc = (...content: BlockDocNode[]): BlockDocNode => ({
  type: "doc",
  content,
});

interface Values {
  // `BlockDocNode` is recursive, which form-core's path types cannot follow.
  body: object | null;
}

/** tiptap leaves its editor on the ProseMirror element. */
function editorOf(element: Element): Editor {
  const editor = Object.getOwnPropertyDescriptor(element, "editor")?.value;
  if (!(editor instanceof Editor))
    throw new Error("No tiptap editor on the element");
  return editor;
}

async function mountInput(
  props: Partial<BlockEditorInputProps> = {},
  options: {
    defaultValues?: Values;
    onData?: (data: Values) => void;
  } = { defaultValues: { body: null } },
) {
  const mounted = mountUnderForm<Values>(
    <BlockEditorInput source="body" blocks={blocks} {...props} />,
    options,
  );
  const textbox = await screen.findByRole("textbox");
  return {
    ...mounted,
    dom: () => elementOf(textbox, HTMLElement),
    editor: () => editorOf(textbox),
    submit: () =>
      act(async () => {
        await mounted.form().submit();
      }),
  };
}

describe("<BlockEditorInput>", () => {
  it("renders the stored document", async () => {
    const { dom } = await mountInput(
      {},
      {
        defaultValues: {
          body: doc(
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Title" }],
            },
            paragraph("Hello world"),
          ),
        },
      },
    );
    expect(dom().querySelector("h2")?.textContent).toBe("Title");
    expect(dom().textContent).toContain("Hello world");
  });

  it("writes the document JSON to the form on edit", async () => {
    const onData = vi.fn();
    const { editor, submit } = await mountInput(
      {},
      { defaultValues: { body: null }, onData },
    );
    act(() => {
      editor().commands.setContent(doc(paragraph("Typed")), {
        emitUpdate: true,
      });
    });
    await submit();
    expect(onData).toHaveBeenCalledWith({ body: doc(paragraph("Typed")) });
  });

  it("writes null for an empty document, so required fails on submit", async () => {
    const onData = vi.fn();
    const { editor, submit } = await mountInput(
      { validate: required() },
      { defaultValues: { body: doc(paragraph("Some text")) }, onData },
    );
    act(() => {
      editor().commands.clearContent(true);
    });
    await submit();
    expect(screen.getByRole("alert").textContent).toContain("Required");
    expect(onData).not.toHaveBeenCalled();
  });

  it("writes null when the empty document is saved", async () => {
    const onData = vi.fn();
    const { editor, submit } = await mountInput(
      {},
      { defaultValues: { body: doc(paragraph("Some text")) }, onData },
    );
    act(() => {
      editor().commands.clearContent(true);
    });
    await submit();
    expect(onData).toHaveBeenCalledWith({ body: null });
  });

  it("replaces the content when the form value changes from outside, without writing back", async () => {
    const { form, dom } = await mountInput(
      {},
      { defaultValues: { body: doc(paragraph("First")) } },
    );
    const next = doc(paragraph("Second"));
    act(() => {
      form().form.setFieldValue("body", next);
    });
    expect(dom().textContent).toContain("Second");
    expect(dom().textContent).not.toContain("First");
    // A write back would store the editor's own JSON, a new object.
    expect(form().form.getFieldValue("body")).toBe(next);
  });

  it("is not editable when disabled or readOnly", async () => {
    const first = await mountInput({ disabled: true });
    expect(first.dom().getAttribute("contenteditable")).toBe("false");
    expect(document.querySelector('[data-slot="block-editor-add"]')).toBeNull();
    cleanup();

    const second = await mountInput({ readOnly: true });
    expect(second.dom().getAttribute("contenteditable")).toBe("false");
    cleanup();

    const third = await mountInput({});
    expect(third.dom().getAttribute("contenteditable")).toBe("true");
    expect(
      document.querySelector('[data-slot="block-editor-add"]'),
    ).not.toBeNull();
  });

  it("renders a defineBlock block with its attributes in edit mode", async () => {
    const { dom } = await mountInput(
      {},
      {
        defaultValues: {
          body: doc({
            type: "callout",
            attrs: { tone: "warn", text: "Careful" },
          }),
        },
      },
    );
    const wrapper = elementOf(
      dom().querySelector('[data-block="callout"]'),
      HTMLElement,
    );
    const view = within(wrapper).getByTestId("callout");
    expect(view.textContent).toBe("Careful");
    expect(view.getAttribute("data-tone")).toBe("warn");
    expect(view.getAttribute("data-mode")).toBe("edit");
  });

  it("typing a slash opens the picker and the query filters by keyword", async () => {
    const { editor } = await mountInput();
    act(() => {
      editor().commands.focus();
      editor().commands.insertContent("/");
    });
    const list = await screen.findByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(2);
    expect(within(list).getByText("Text")).toBeTruthy();
    expect(within(list).getByText("Highlight a note")).toBeTruthy();

    act(() => {
      editor().commands.insertContent("alert");
    });
    await waitFor(() =>
      expect(
        within(screen.getByRole("listbox")).getAllByRole("option"),
      ).toHaveLength(1),
    );
    expect(screen.getByRole("option", { name: /Callout/ })).toBeTruthy();
  });

  it("choosing a block replaces the slash text with the block and its defaults", async () => {
    const onData = vi.fn();
    const { editor, dom, submit } = await mountInput(
      {},
      { defaultValues: { body: null }, onData },
    );
    act(() => {
      editor().commands.focus();
      editor().commands.insertContent("/call");
    });
    fireEvent.click(await screen.findByRole("option", { name: /Callout/ }));
    await submit();

    const written = onData.mock.calls[0]?.[0]?.body;
    expect(written?.content?.[0]).toEqual({
      type: "callout",
      attrs: { tone: "info", text: "" },
    });
    expect(JSON.stringify(written)).not.toContain("/call");
    expect(dom().querySelector('[data-block="callout"]')).not.toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("Enter inserts the highlighted block", async () => {
    const onData = vi.fn();
    const { editor, dom, submit } = await mountInput(
      {},
      { defaultValues: { body: null }, onData },
    );
    act(() => {
      editor().commands.focus();
      editor().commands.insertContent("/");
    });
    await screen.findByRole("listbox");
    fireEvent.keyDown(dom(), { key: "ArrowDown" });
    fireEvent.keyDown(dom(), { key: "Enter" });
    await submit();
    expect(onData.mock.calls[0]?.[0]?.body?.content?.[0]).toEqual({
      type: "counter",
      attrs: { start: 0 },
    });
  });

  it("Escape closes the picker without inserting", async () => {
    const onData = vi.fn();
    const { editor, dom, submit } = await mountInput(
      {},
      { defaultValues: { body: null }, onData },
    );
    act(() => {
      editor().commands.focus();
      editor().commands.insertContent("/");
    });
    await screen.findByRole("listbox");
    fireEvent.keyDown(dom(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await submit();
    expect(JSON.stringify(onData.mock.calls[0]?.[0]?.body)).not.toContain(
      "callout",
    );
    expect(dom().querySelector("[data-block]")).toBeNull();
  });

  it("the Add block button opens the picker and inserts at the caret", async () => {
    const onData = vi.fn();
    const { dom, submit } = await mountInput(
      {},
      { defaultValues: { body: null }, onData },
    );
    fireEvent.click(
      defined(document.querySelector('[data-slot="block-editor-add"]')),
    );
    fireEvent.click(await screen.findByRole("option", { name: /Counter/ }));
    await submit();
    expect(onData.mock.calls[0]?.[0]?.body?.content?.[0]).toEqual({
      type: "counter",
      attrs: { start: 0 },
    });
    expect(dom().querySelector('[data-block="counter"]')).not.toBeNull();
  });

  it("keeps an unknown node and writes it back unchanged on the next edit", async () => {
    const mystery: BlockDocNode = {
      type: "mystery",
      attrs: { nested: { a: [1, 2] } },
      content: [paragraph("inside")],
    };
    const onData = vi.fn();
    const { editor, dom, submit } = await mountInput(
      {},
      { defaultValues: { body: doc(mystery, paragraph("After")) }, onData },
    );
    expect(dom().textContent).toContain(
      "Unknown block: mystery. It is kept on save.",
    );
    act(() => {
      const end = editor().state.doc.content.size - 1;
      editor().commands.insertContentAt(end, "!");
    });
    await submit();
    expect(onData).toHaveBeenCalledWith({
      body: doc(mystery, paragraph("After!")),
    });
  });

  it("keeps a block with an unknown mark or an unknown inline node, and writes it back unchanged", async () => {
    const highlighted: BlockDocNode = {
      type: "paragraph",
      content: [
        { type: "text", text: "hi", marks: [{ type: "highlight" }] },
        { type: "emoji", attrs: { name: "smile" } },
      ],
    };
    const onData = vi.fn();
    const { editor, dom, submit } = await mountInput(
      {},
      { defaultValues: { body: doc(highlighted, paragraph("After")) }, onData },
    );
    expect(dom().textContent).toContain("After");
    act(() => {
      const end = editor().state.doc.content.size - 1;
      editor().commands.insertContentAt(end, "!");
    });
    await submit();
    expect(onData).toHaveBeenCalledWith({
      body: doc(highlighted, paragraph("After!")),
    });
  });

  it("keeps the blank lines while the user clears the text", async () => {
    const onData = vi.fn();
    const blank: BlockDocNode = { type: "paragraph" };
    const { editor, submit } = await mountInput(
      {},
      {
        defaultValues: { body: doc(paragraph("abc"), blank, blank) },
        onData,
      },
    );
    act(() => {
      editor().commands.deleteRange({ from: 1, to: 4 });
    });
    // The echo of the user's own edit must not reset the editor.
    expect(editor().state.doc.childCount).toBe(3);
    await submit();
    expect(onData).toHaveBeenCalledWith({ body: null });
  });

  it("shows hostile stored content as text", async () => {
    const { dom } = await mountInput(
      {},
      {
        defaultValues: {
          body: doc(
            { type: "<img src=x onerror=alert(1)>" },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "click",
                  marks: [
                    { type: "link", attrs: { href: "javascript:alert(1)" } },
                  ],
                },
              ],
            },
          ),
        },
      },
    );
    expect(dom().textContent).toContain(
      "Unknown block: <img src=x onerror=alert(1)>. It is kept on save.",
    );
    expect(document.querySelector("img")).toBeNull();
    expect(dom().textContent).toContain("click");
    const hrefs = [...document.querySelectorAll("a")].map(
      (a) => a.getAttribute("href") ?? "",
    );
    expect(
      hrefs.some((href) => href.toLowerCase().startsWith("javascript:")),
    ).toBe(false);
  });
});

describe("<BlockDocField>", () => {
  const stored = doc(paragraph("Intro"), {
    type: "callout",
    attrs: { tone: "warn", text: "Careful" },
  });

  it("renders the document read-only with the read component of a block", async () => {
    mountUnderForm<Values>(
      <BlockDocField
        source="body"
        record={{ id: 1, body: stored }}
        blocks={blocks}
      />,
    );
    const view = await screen.findByTestId("callout-read");
    expect(view.textContent).toBe("Read: Careful");
    expect(screen.queryByTestId("callout")).toBeNull();
    const textbox = screen.getByRole("textbox");
    expect(textbox.getAttribute("contenteditable")).toBe("false");
    expect(textbox.textContent).toContain("Intro");
    expect(document.querySelector('[data-slot="block-editor-add"]')).toBeNull();
  });

  it("renders empty for a missing value", () => {
    mountUnderForm<Values>(
      <BlockDocField
        source="body"
        record={{ id: 1, body: null }}
        blocks={blocks}
        empty="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
