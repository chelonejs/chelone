import { defined, elementOf } from "@chelone/test-utils";
import { describe, expect, it, vi } from "vitest";
import { mountInput } from "./__fixtures__/rich-text-harness";

type Mounted = Awaited<ReturnType<typeof mountInput>>;

const BLUE =
  '<p><span style="color: var(--rich-text-color-bright-blue);">hello</span></p>';

const colorButton = ({ wrapper }: Mounted) =>
  wrapper.get('button[aria-label="Text color"]');

async function openPanel(mounted: Mounted) {
  await colorButton(mounted).trigger("click");
  return mounted.wrapper.get('[data-slot="rich-text-color"]');
}

function swatch(panel: Awaited<ReturnType<typeof openPanel>>, name: string) {
  return elementOf(
    panel.get(`button[aria-label="${name}"]`).element,
    HTMLButtonElement,
  );
}

describe("rich text color", () => {
  it("a swatch colors the selection and reports it with aria-pressed", async () => {
    const mounted = await mountInput({}, { body: "<p>hello</p>" });
    mounted.editor().commands.selectAll();
    const panel = await openPanel(mounted);
    expect(swatch(panel, "Bright blue").getAttribute("aria-pressed")).toBe(
      "false",
    );

    swatch(panel, "Bright blue").click();

    expect(mounted.editor().getHTML()).toBe(BLUE);
    await vi.waitFor(() =>
      expect(swatch(panel, "Bright blue").getAttribute("aria-pressed")).toBe(
        "true",
      ),
    );
    expect(swatch(panel, "Soft blue").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(mounted.editor().getHTML()).not.toContain("hljs");
  });

  it("Default clears the color, and colors false leaves out the button", async () => {
    const mounted = await mountInput(
      {},
      {
        body: '<p><span style="color: var(--rich-text-color-bright-red)">hello</span></p>',
      },
    );
    mounted.editor().commands.selectAll();
    const panel = await openPanel(mounted);
    await vi.waitFor(() =>
      expect(swatch(panel, "Bright red").getAttribute("aria-pressed")).toBe(
        "true",
      ),
    );

    swatch(panel, "Default").click();

    expect(mounted.editor().getHTML()).toBe("<p>hello</p>");
    await vi.waitFor(() =>
      expect(swatch(panel, "Default").getAttribute("aria-pressed")).toBe(
        "true",
      ),
    );

    const plain = await mountInput({ colors: false }, { body: "<p>hello</p>" });
    expect(plain.wrapper.find('button[aria-label="Text color"]').exists()).toBe(
      false,
    );
    expect(plain.editor().schema.marks.textStyle).toBeUndefined();
  });

  it("Enter ends the color for the next line", async () => {
    const mounted = await mountInput(
      {},
      {
        body: '<p><span style="color: var(--rich-text-color-bright-red);">first</span></p>',
      },
    );
    mounted.editor().commands.focus("end");

    // A real key event, since the keyboardShortcut command skips the stored marks.
    await mounted.wrapper.get('[role="textbox"]').trigger("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
    });
    mounted.editor().commands.insertContent({ type: "text", text: "second" });

    expect(mounted.editor().getHTML()).toBe(
      '<p><span style="color: var(--rich-text-color-bright-red);">first</span></p><p>second</p>',
    );
  });

  it("the field keeps a palette color and drops hostile styles", async () => {
    const { wrapper } = await mountInput(
      {},
      {
        fieldBody: [
          '<p><span style="color: var(--rich-text-color-bright-blue)">ok</span></p>',
          '<p style="position:fixed">fixed</p>',
          '<p><span style="color: red; background: url(javascript:alert(1))">bg</span></p>',
          '<p><span style="color: expression(alert(1))">expr</span></p>',
        ].join(""),
      },
    );
    const root = wrapper.get('[data-slot="rich-text-field"]').element;
    const styled = [...root.querySelectorAll("[style]")];
    expect(styled.map((node) => node.textContent)).toEqual(["ok"]);
    expect(styled[0]?.getAttribute("style")).toBe(
      "color: var(--rich-text-color-bright-blue)",
    );
    expect(root.textContent).toBe("okfixedbgexpr");
  });
});

const TRAILING = "<p></p>";
const JS_BLOCK =
  '<pre><code class="language-javascript">const a = 1;</code></pre>';

const keywords = () =>
  [...document.querySelectorAll(".hljs-keyword")].map(
    (node) => node.textContent,
  );

describe("rich text code blocks", () => {
  it("a code block with a language gets highlight classes in the editor", async () => {
    await mountInput({}, { body: JS_BLOCK });
    await vi.waitFor(() => expect(keywords()).toEqual(["const"]));
  });

  it("codeHighlight false leaves the highlight classes out", async () => {
    const { editor } = await mountInput(
      { codeHighlight: false },
      { body: JS_BLOCK },
    );
    expect(document.querySelector("pre code")?.textContent).toBe(
      "const a = 1;",
    );
    expect(keywords()).toEqual([]);
    expect(editor().getHTML()).toBe(JS_BLOCK + TRAILING);
  });

  it("the stored HTML keeps the language class and no highlight markup", async () => {
    const { editor, form } = await mountInput({}, { body: JS_BLOCK });
    await vi.waitFor(() => expect(keywords()).toEqual(["const"]));
    const blockEnd = defined(editor().state.doc.firstChild).nodeSize - 1;
    editor().commands.focus(blockEnd);
    editor().commands.insertContent({ type: "text", text: " // more" });

    expect(editor().getHTML()).toBe(
      `<pre><code class="language-javascript">const a = 1; // more</code></pre>${TRAILING}`,
    );
    await vi.waitFor(() =>
      expect(form.values.value.body).toBe(editor().getHTML()),
    );
    expect(editor().getHTML()).not.toContain("hljs");
  });

  it("code text with markup stays text", async () => {
    const { editor } = await mountInput({}, { body: "" });
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
