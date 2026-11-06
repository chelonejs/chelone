import { richTextToolbarItems } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { mountUnderForm } from "./__fixtures__/rich-text-harness";
import { RichTextInput, type RichTextInputProps } from "./rich-text-input";

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

async function mountInput(
  props: Partial<RichTextInputProps> = {},
  body = "<p>hello</p>",
) {
  const created: { editor: Editor | null } = { editor: null };
  mountUnderForm(
    <RichTextInput
      source="body"
      {...props}
      editorOptions={{
        onCreate: (event) => {
          created.editor = event.editor;
        },
      }}
    />,
    { defaultValues: { body } },
  );
  await screen.findByRole("textbox");
  return () => defined(created.editor);
}

const button = (name: string) =>
  elementOf(screen.getByRole("button", { name }), HTMLButtonElement);

describe("<RichTextToolbar>", () => {
  it("the bold button toggles bold and reports it with aria-pressed", async () => {
    const editor = await mountInput();
    act(() => {
      editor().commands.selectAll();
    });
    expect(button("Bold").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button("Bold"));
    expect(editor().getHTML()).toBe("<p><strong>hello</strong></p>");
    expect(button("Bold").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button("Bold"));
    expect(editor().getHTML()).toBe("<p>hello</p>");
    expect(button("Bold").getAttribute("aria-pressed")).toBe("false");
  });

  it("the block type select turns a paragraph into a heading", async () => {
    const editor = await mountInput();
    const select = elementOf(
      screen.getByRole("combobox", { name: "Block type" }),
      HTMLSelectElement,
    );
    expect(select.value).toBe("paragraph");
    fireEvent.change(select, { target: { value: "heading2" } });
    // StarterKit keeps an empty paragraph after a last-block heading.
    expect(editor().getHTML()).toContain("<h2>hello</h2>");
    expect(select.value).toBe("heading2");
    fireEvent.change(select, { target: { value: "paragraph" } });
    expect(editor().getHTML()).toContain("<p>hello</p>");
    expect(editor().getHTML()).not.toContain("<h2>");
  });

  it("the link form applies an https link and removes it with an empty URL", async () => {
    const editor = await mountInput();
    act(() => {
      editor().commands.selectAll();
    });
    fireEvent.click(button("Link"));
    const form = defined(
      document.querySelector<HTMLElement>('[data-slot="rich-text-link-form"]'),
    );
    fireEvent.change(within(form).getByRole("textbox", { name: "URL" }), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Apply" }));
    expect(editor().getHTML()).toContain('href="https://example.com"');
    expect(editor().getHTML()).toContain(">hello</a>");
    expect(
      document.querySelector('[data-slot="rich-text-link-form"]'),
    ).toBeNull();

    // The form opens on the link under the cursor, and an empty URL removes it.
    act(() => {
      editor().commands.setTextSelection(3);
    });
    fireEvent.click(button("Link"));
    const reopened = defined(
      document.querySelector<HTMLElement>('[data-slot="rich-text-link-form"]'),
    );
    const input = elementOf(
      within(reopened).getByRole("textbox", { name: "URL" }),
      HTMLInputElement,
    );
    expect(input.value).toBe("https://example.com");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(within(reopened).getByRole("button", { name: "Apply" }));
    expect(editor().getHTML()).toBe("<p>hello</p>");
  });

  it("the link form rejects a javascript URL and writes nothing", async () => {
    const editor = await mountInput();
    act(() => {
      editor().commands.selectAll();
    });
    fireEvent.click(button("Link"));
    const form = defined(
      document.querySelector<HTMLElement>('[data-slot="rich-text-link-form"]'),
    );
    fireEvent.change(within(form).getByRole("textbox", { name: "URL" }), {
      target: { value: "java\tscript:alert(1)" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Apply" }));
    expect(within(form).getByRole("alert").textContent).toBe(
      "Enter a web, mail or phone link",
    );
    expect(editor().getHTML()).toBe("<p>hello</p>");
  });

  it("buttons are disabled while the editor is not editable", async () => {
    const editor = await mountInput();
    // Nothing to undo yet, so undo is disabled even while editable.
    expect(button("Undo").disabled).toBe(true);
    expect(button("Bold").disabled).toBe(false);
    act(() => {
      editor().commands.insertContent("!");
    });
    expect(button("Undo").disabled).toBe(false);
    expect(button("Redo").disabled).toBe(true);

    cleanup();
    await mountInput({ readOnly: true });
    const toolbar = screen.getByRole("toolbar");
    const buttons = within(toolbar).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(10);
    for (const each of buttons) {
      expect(elementOf(each, HTMLButtonElement).disabled).toBe(true);
    }
    expect(
      elementOf(
        within(toolbar).getByRole("combobox", { name: "Block type" }),
        HTMLSelectElement,
      ).disabled,
    ).toBe(true);
  });

  it("lists the buttons in the order core documents", async () => {
    await mountInput();
    const names = within(screen.getByRole("toolbar"))
      .getAllByRole("button")
      .map((each) => each.getAttribute("aria-label"));
    // The Image button joins the insert group, right after Link.
    expect(names).toEqual(
      richTextToolbarItems.flatMap((item) =>
        item.id === "link" ? [item.defaultLabel, "Image"] : [item.defaultLabel],
      ),
    );
  });

  it("a toolbar prop replaces the default toolbar and null hides it", async () => {
    await mountInput();
    expect(screen.getByRole("toolbar")).toBeTruthy();
    cleanup();

    await mountInput({ toolbar: <div data-testid="custom-toolbar" /> });
    expect(screen.getByTestId("custom-toolbar")).toBeTruthy();
    expect(screen.queryByRole("toolbar")).toBeNull();
    cleanup();

    await mountInput({ toolbar: null });
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Bold" })).toBeNull();
  });
});
