import { defined } from "@chelone/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
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

afterEach(cleanup);

/** StarterKit keeps an empty paragraph after a last code block. */
const TRAILING = "<p></p>";

const JS_BLOCK =
  '<pre><code class="language-javascript">const a = 1;</code></pre>';

async function mountInput(props: Partial<RichTextInputProps>, body: string) {
  const created: { editor: Editor | null } = { editor: null };
  const { form } = mountUnderForm<{ body: string }>(
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
  return {
    editor: () => defined(created.editor),
    /** What the form would save. */
    value: () => form().form.getFieldValue("body"),
  };
}

const keywords = () =>
  [...document.querySelectorAll(".hljs-keyword")].map(
    (node) => node.textContent,
  );

describe("rich text code blocks", () => {
  it("a code block with a language gets highlight classes in the editor", async () => {
    await mountInput({}, JS_BLOCK);
    await waitFor(() => expect(keywords()).toEqual(["const"]));
  });

  it("codeHighlight false leaves the highlight classes out", async () => {
    const { editor } = await mountInput({ codeHighlight: false }, JS_BLOCK);
    expect(document.querySelector("pre code")?.textContent).toBe(
      "const a = 1;",
    );
    expect(keywords()).toEqual([]);
    expect(editor().getHTML()).toBe(JS_BLOCK + TRAILING);
  });

  it("the stored HTML keeps the language class and no highlight markup", async () => {
    const { editor, value } = await mountInput({}, JS_BLOCK);
    await waitFor(() => expect(keywords()).toEqual(["const"]));
    const blockEnd = defined(editor().state.doc.firstChild).nodeSize - 1;
    editor().commands.focus(blockEnd);
    editor().commands.insertContent({ type: "text", text: " // more" });

    expect(editor().getHTML()).toBe(
      `<pre><code class="language-javascript">const a = 1; // more</code></pre>${TRAILING}`,
    );
    await waitFor(() => expect(value()).toBe(editor().getHTML()));
    expect(editor().getHTML()).not.toContain("hljs");
  });

  it("code text with markup stays text", async () => {
    const { editor } = await mountInput({}, "");
    editor().commands.setCodeBlock({ language: "xml" });
    editor()
      .chain()
      .insertContent({ type: "text", text: "<script>alert(1)</script>" })
      .run();

    expect(editor().getHTML()).toBe(
      '<pre><code class="language-xml">&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>' +
        TRAILING,
    );
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("pre code")?.textContent).toBe(
      "<script>alert(1)</script>",
    );
  });
});
