import { required } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

interface Values {
  body: string;
}

/** Mounts the input and waits for its editor, which tiptap creates after the first render. */
async function mountInput(
  props: Partial<RichTextInputProps> = {},
  options: {
    defaultValues?: Values;
    onData?: (data: Values) => void;
  } = { defaultValues: { body: "" } },
) {
  const created: { editor: Editor | null } = { editor: null };
  const editorOptions: RichTextInputProps["editorOptions"] = {
    ...props.editorOptions,
    onCreate: (event) => {
      created.editor = event.editor;
      props.editorOptions?.onCreate?.(event);
    },
  };
  const element = (extra: Partial<RichTextInputProps> = {}) => (
    <RichTextInput
      source="body"
      {...props}
      {...extra}
      editorOptions={editorOptions}
    />
  );
  const mounted = mountUnderForm<Values>(element(), options);
  await screen.findByRole("textbox");
  return {
    ...mounted,
    editor: () => defined(created.editor),
    rerenderInput: (extra: Partial<RichTextInputProps> = {}) =>
      mounted.rerender(element(extra)),
    dom: () => elementOf(screen.getByRole("textbox"), HTMLElement),
  };
}

describe("<RichTextInput>", () => {
  it("renders the initial HTML value", async () => {
    const { dom } = await mountInput(
      {},
      { defaultValues: { body: "<p>Hello <strong>world</strong></p>" } },
    );
    expect(dom().querySelector("p")?.textContent).toBe("Hello world");
    expect(dom().querySelector("strong")?.textContent).toBe("world");
    expect(dom().classList.contains("rich-text")).toBe(true);
    expect(
      document.querySelector('[data-slot="rich-text-input"]'),
    ).not.toBeNull();
  });

  it("renders a custom label and helper text", async () => {
    await mountInput({
      label: "Article body",
      helperText: "Shown on the page",
    });
    expect(screen.getByText("Article body")).toBeTruthy();
    expect(screen.getByText("Shown on the page")).toBeTruthy();
    const label = screen.getByText("Article body").closest("label");
    expect(label?.htmlFor).toBeTruthy();
    expect(
      document
        .getElementById(defined(label).htmlFor)
        ?.contains(screen.getByRole("textbox")),
    ).toBe(true);
  });

  it("is not editable when disabled or readOnly", async () => {
    const first = await mountInput({ disabled: true });
    expect(first.dom().getAttribute("contenteditable")).toBe("false");
    expect(first.editor().isEditable).toBe(false);
    cleanup();

    const second = await mountInput({ readOnly: true });
    expect(second.dom().getAttribute("contenteditable")).toBe("false");
    cleanup();

    const third = await mountInput({});
    expect(third.dom().getAttribute("contenteditable")).toBe("true");
  });

  it("names the textbox with the label", async () => {
    await mountInput({ label: "Article body" });
    expect(screen.getByRole("textbox", { name: "Article body" })).toBeTruthy();
  });

  it("follows a placeholder that changes after mount", async () => {
    const { dom, rerenderInput } = await mountInput({ placeholder: "First" });
    const shown = () =>
      dom().querySelector("p")?.getAttribute("data-placeholder");
    expect(shown()).toBe("First");
    rerenderInput({ placeholder: "Second" });
    await waitFor(() => expect(shown()).toBe("Second"));
  });

  it("disables and re-enables the toolbar when disabled changes after mount", async () => {
    const { rerenderInput, dom } = await mountInput({});
    const bold = () =>
      elementOf(
        screen.getByRole("button", { name: "Bold" }),
        HTMLButtonElement,
      );
    const block = () =>
      elementOf(
        screen.getByRole("combobox", { name: "Block type" }),
        HTMLSelectElement,
      );
    expect(bold().disabled).toBe(false);
    rerenderInput({ disabled: true });
    await waitFor(() => expect(bold().disabled).toBe(true));
    expect(block().disabled).toBe(true);
    expect(dom().getAttribute("contenteditable")).toBe("false");
    rerenderInput({ disabled: false });
    await waitFor(() => expect(bold().disabled).toBe(false));
    expect(block().disabled).toBe(false);
  });

  it("shows the required error on submit when the editor is empty", async () => {
    const { form } = await mountInput({ validate: required() });
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await form().submit();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });

  it("writes the editor HTML to the form on change", async () => {
    const onData = vi.fn();
    const { editor, form } = await mountInput(
      {},
      { defaultValues: { body: "" }, onData },
    );
    act(() => {
      editor().commands.setContent("<p>Typed</p>", { emitUpdate: true });
    });
    await act(async () => {
      await form().submit();
    });
    expect(onData).toHaveBeenCalledWith({ body: "<p>Typed</p>" });
  });

  it("writes an empty string when the editor is cleared", async () => {
    const onData = vi.fn();
    const { editor, form } = await mountInput(
      {},
      { defaultValues: { body: "<p>Some text</p>" }, onData },
    );
    act(() => {
      editor().commands.clearContent(true);
    });
    await act(async () => {
      await form().submit();
    });
    expect(onData).toHaveBeenCalledWith({ body: "" });
  });

  it("replaces the content when the form value changes from outside, without writing back", async () => {
    const onUpdate = vi.fn();
    const { form, dom } = await mountInput(
      { editorOptions: { onUpdate } },
      { defaultValues: { body: "<p>First</p>" } },
    );
    act(() => {
      form().form.setFieldValue("body", "<h2>Second</h2>");
    });
    expect(dom().querySelector("h2")?.textContent).toBe("Second");
    expect(dom().textContent).not.toContain("First");
    expect(onUpdate).not.toHaveBeenCalled();
    expect(form().form.getFieldValue("body")).toBe("<h2>Second</h2>");
  });

  it("does not reset the editor when the parent re-renders", async () => {
    const onCreate = vi.fn();
    const { editor, dom, rerenderInput } = await mountInput(
      { editorOptions: { onCreate } },
      { defaultValues: { body: "<p>Hello world</p>" } },
    );
    const before = dom();
    act(() => {
      editor().commands.setTextSelection(4);
    });
    rerenderInput({ className: "other" });
    rerenderInput({ className: "another" });
    expect(dom()).toBe(before);
    expect(editor().state.selection.from).toBe(4);
    expect(dom().textContent).toBe("Hello world");
  });

  it("marks the field touched on blur", async () => {
    const { form, dom } = await mountInput();
    expect(form().isTouched).toBe(false);
    act(() => {
      dom().focus();
    });
    act(() => {
      fireEvent.blur(dom());
    });
    expect(form().isTouched).toBe(true);
  });

  it("editorOptions.extensions replaces the default extensions", async () => {
    const { dom } = await mountInput(
      {
        editorOptions: { extensions: [StarterKit.configure({ bold: false })] },
      },
      { defaultValues: { body: "<p><strong>Bold</strong> text</p>" } },
    );
    expect(dom().textContent).toBe("Bold text");
    expect(dom().querySelector("strong")).toBeNull();
  });

  it("drops hostile markup from a stored value", async () => {
    const hostile = [
      "<img src=x onerror=alert(1)>",
      "<script>alert(1)</script>",
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(1)">x</a>',
      "<p>kept</p>",
    ].join("");
    const onData = vi.fn();
    const { editor, dom, form } = await mountInput(
      {},
      { defaultValues: { body: hostile }, onData },
    );
    expect(dom().querySelector("img, script, iframe")).toBeNull();
    expect(dom().querySelector("a[href^='javascript']")).toBeNull();
    for (const node of dom().querySelectorAll("*")) {
      expect(
        node.getAttributeNames().filter((name) => name.startsWith("on")),
      ).toEqual([]);
    }
    act(() => {
      editor().commands.insertContent("!");
    });
    await act(async () => {
      await form().submit();
    });
    const written = onData.mock.calls[0]?.[0]?.body;
    expect(written).toContain("kept");
    expect(written).not.toMatch(/<img|<script|<iframe|onerror|javascript:/i);
  });
});
