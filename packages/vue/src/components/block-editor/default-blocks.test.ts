import { type BlockAttrs, type BlockDocNode, isBlockDoc } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { flushPromises } from "@vue/test-utils";
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { h } from "vue";
import { z } from "zod";
import {
  doc,
  type FormValues,
  mountBlockEditor,
  paragraph,
  stubLayout,
  unmountAll,
} from "./__fixtures__/block-editor-harness";
import { defineBlock, NodeViewContent } from "./block-nodes";

beforeAll(stubLayout);
afterEach(unmountAll);

const block = (
  type: string,
  attrs: BlockAttrs,
  ...content: BlockDocNode[]
): BlockDocNode => ({
  type,
  attrs,
  ...(content.length > 0 ? { content } : {}),
});

const stored = (...content: BlockDocNode[]) => ({ body: doc(...content) });

const showsOnly = (selector: string, src: string) =>
  [...document.querySelectorAll(selector)].filter(
    (element) => element.getAttribute("src") === src,
  );

const textOf = (text: string) =>
  defined(
    [...document.querySelectorAll("p, span, div")].find(
      (element) => element.textContent === text,
    ),
  );

const buttonOf = (name: string) =>
  elementOf(
    document.querySelector(`button[aria-label="${name}"]`),
    HTMLButtonElement,
  );

const summaryOf = (name: string) =>
  elementOf(
    [...document.querySelectorAll("button")].find(
      (element) => element.textContent === name,
    ),
    HTMLButtonElement,
  );

/** The control a label names. */
const controlOf = (label: string) => {
  const target = [...document.querySelectorAll("label")].find(
    (element) => element.textContent === label,
  );
  return elementOf(
    document.getElementById(defined(target).htmlFor),
    HTMLElement,
  );
};

const written = (onSubmit: Mock<(data: FormValues) => Promise<undefined>>) => {
  const body = onSubmit.mock.calls.at(-1)?.[0].body;
  return isBlockDoc(body) ? body : null;
};

describe("default blocks", () => {
  it("the editor offers callout, toggle, image and embed when no blocks are given", async () => {
    const { editor } = await mountBlockEditor();
    editor().commands.focus();
    editor().commands.insertContent("/");
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[role="option"]')).toHaveLength(4),
    );
    expect(
      [...document.querySelectorAll('[role="option"]')].map(
        (option) => option.textContent,
      ),
    ).toEqual([
      expect.stringContaining("Callout"),
      expect.stringContaining("Toggle"),
      expect.stringContaining("Image"),
      expect.stringContaining("Embed"),
    ]);
  });

  it("a callout renders its variant and its content", async () => {
    const { dom } = await mountBlockEditor(
      {},
      {
        body: doc(
          block("callout", { variant: "warning" }, paragraph("Mind the gap")),
        ),
      },
    );
    const callout = defined(
      dom().querySelector('[data-block="callout"] [data-variant]'),
    );
    expect(callout.getAttribute("data-variant")).toBe("warning");
    expect(callout.textContent).toContain("Mind the gap");
  });

  it("a callout without a variant is an info callout", async () => {
    const { dom } = await mountBlockEditor(
      {},
      { body: doc(block("callout", {}, paragraph("Plain"))) },
    );
    expect(
      dom()
        .querySelector('[data-block="callout"] [data-variant]')
        ?.getAttribute("data-variant"),
    ).toBe("info");
  });

  it("a toggle opens and closes in the field and writes nothing", async () => {
    const body = doc(
      block("toggle", { summary: "More", open: false }, paragraph("Inside")),
      paragraph("After"),
    );
    const { submit, onSubmit } = await mountBlockEditor(
      { readOnly: true },
      { body },
    );
    const summary = summaryOf("More");
    const hidden = () => textOf("Inside").closest("[hidden]");
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(hidden()).not.toBeNull();

    summary.click();
    await flushPromises();
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(hidden()).toBeNull();

    summary.click();
    await flushPromises();
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(hidden()).not.toBeNull();

    summary.click();
    await flushPromises();
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ body });
  });

  it("a toggle shows its content in edit mode and its button writes nothing", async () => {
    const body = doc(
      block("toggle", { summary: "More", open: false }, paragraph("Inside")),
      paragraph("After"),
    );
    const { submit, onSubmit } = await mountBlockEditor({}, { body });
    expect(textOf("Inside").closest("[hidden]")).toBeNull();
    summaryOf("More").click();
    await flushPromises();
    expect(textOf("Inside").closest("[hidden]")).toBeNull();
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ body });
  });

  it("an embed of a YouTube URL renders a sandboxed nocookie iframe", async () => {
    await mountBlockEditor(
      {},
      { body: doc(block("embed", { url: "https://youtu.be/dQw4w9WgXcQ" })) },
    );
    const frame = defined(document.querySelector("iframe"));
    expect(frame.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(frame.getAttribute("sandbox")).toBe(
      "allow-scripts allow-same-origin allow-presentation",
    );
    expect(frame.getAttribute("referrerpolicy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(frame.getAttribute("title")).toBe("Embedded video");
  });

  it("an embed without a usable URL asks for a YouTube or Vimeo link", async () => {
    await mountBlockEditor({}, { body: doc(block("embed", { url: "" })) });
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.body.textContent).toContain("YouTube");
    expect(document.body.textContent).toContain("Vimeo");
  });

  it("an image renders its source, alt text and width", async () => {
    await mountBlockEditor(
      {},
      {
        body: doc(
          block("image", {
            src: "https://example.com/cat.png",
            alt: "A cat",
            widthPct: 40,
          }),
        ),
      },
    );
    const img = elementOf(
      document.querySelector('img[alt="A cat"]'),
      HTMLImageElement,
    );
    expect(img.getAttribute("src")).toBe("https://example.com/cat.png");
    expect(img.getAttribute("style")).toContain("40%");
  });

  it("an image without a source asks for an image", async () => {
    await mountBlockEditor({}, { body: doc(block("image", { src: "" })) });
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.textContent).toContain("Add an image");
  });

  it("an image or embed with a hostile source renders no element for it", async () => {
    const hostile = [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "https://evil.example/x",
    ];
    for (const src of hostile) {
      await mountBlockEditor({}, { body: doc(block("embed", { url: src })) });
      expect(showsOnly("iframe", src)).toEqual([]);
      expect(document.querySelector("iframe")).toBeNull();
      unmountAll();
    }
    // An https URL is a fine image, so only the two unsafe schemes are hostile there.
    for (const src of hostile.slice(0, 2)) {
      await mountBlockEditor({}, { body: doc(block("image", { src })) });
      expect(showsOnly("img", src)).toEqual([]);
      expect(document.querySelector("img")).toBeNull();
      unmountAll();
    }
  });

  it("the toggle summary renders markup as text", async () => {
    const summary = "<img src=x onerror=alert(1)>";
    await mountBlockEditor(
      {},
      { body: doc(block("toggle", { summary }, paragraph("Inside"))) },
    );
    expect(document.querySelector("img")).toBeNull();
    expect(summaryOf(summary)).toBeTruthy();
  });

  async function openImageConfig() {
    // The closing paragraph keeps the editor from adding its own.
    const body = doc(block("image", { src: "", alt: "" }), paragraph("End"));
    const mounted = await mountBlockEditor({}, { body });
    mounted.editor().commands.setNodeSelection(0);
    await flushPromises();
    buttonOf("Configure").click();
    await flushPromises();
    return { ...mounted, body };
  }

  const choose = async (label: string, file: File) => {
    const input = elementOf(controlOf(label), HTMLInputElement);
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
  };

  const typeInto = async (label: string, value: string) => {
    const input = elementOf(controlOf(label), HTMLInputElement);
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
  };

  const alert = () => document.querySelector('[role="alert"]');

  it("an image file over 5 MB shows an error and writes nothing", async () => {
    const { submit, body, onSubmit } = await openImageConfig();
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    await choose("Upload image", big);
    await vi.waitFor(() =>
      expect(alert()?.textContent).toBe("Choose an image file up to 5 MB"),
    );
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ body });
  });

  it("a file that is not an image shows an error and writes nothing", async () => {
    const { submit, body, onSubmit } = await openImageConfig();
    await choose(
      "Upload image",
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );
    await vi.waitFor(() =>
      expect(alert()?.textContent).toBe("Choose an image file up to 5 MB"),
    );
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ body });
  });

  it("an image file within 5 MB is stored as a data URL", async () => {
    const { submit, onSubmit } = await openImageConfig();
    await choose(
      "Upload image",
      new File([new Uint8Array([137, 80, 78, 71])], "dot.png", {
        type: "image/png",
      }),
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-block="image"] img')).not.toBeNull(),
    );
    await submit();
    expect(written(onSubmit)?.content?.[0]?.attrs?.src).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("the URL, alt text and width write their own attribute", async () => {
    const { submit, onSubmit } = await openImageConfig();
    await typeInto("Image URL", "https://example.com/cat.png");
    await typeInto("Alt text", "A cat");
    await typeInto("Width (%)", "50");
    await submit();
    expect(written(onSubmit)?.content?.[0]?.attrs).toEqual({
      src: "https://example.com/cat.png",
      alt: "A cat",
      widthPct: 50,
    });
  });
});

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
  render: ({ attrs }) => h("aside", String(attrs.title)),
});

const plain = defineBlock({
  name: "plain",
  label: "Plain",
  group: "Text",
  schema: z.object({ title: z.string().default("") }),
  render: ({ attrs }) => h("aside", String(attrs.title)),
});

const box = defineBlock({
  name: "box",
  label: "Box",
  group: "Text",
  schema: z.object({ title: z.string().default("") }),
  content: "block+",
  render: ({ attrs }) => h("aside", [String(attrs.title), h(NodeViewContent)]),
});

const blocks = [note, plain, box];

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

const titles = (content: BlockDocNode[] | undefined) =>
  (content ?? []).map((node) => node.attrs?.title ?? node.type);

async function mount(...content: BlockDocNode[]) {
  return mountBlockEditor({ blocks }, stored(...content));
}

type Mounted = Awaited<ReturnType<typeof mount>>;

const select = async (editor: Mounted["editor"], index: number) => {
  const { doc: root } = editor().state;
  let pos = 0;
  for (let i = 0; i < index; i++) pos += root.child(i).nodeSize;
  editor().commands.setNodeSelection(pos);
  await flushPromises();
};

/** What the form holds, minus the closing paragraph StarterKit keeps after a last block. */
const content = (mounted: Mounted) => {
  const body = mounted.form.form.getFieldValue("body");
  const nodes = isBlockDoc(body) ? body.content : undefined;
  const last = nodes?.at(-1);
  return last?.type === "paragraph" && last.content === undefined
    ? nodes?.slice(0, -1)
    : nodes;
};

const toolbar = () => document.querySelector('[role="toolbar"]');

describe("block toolbar", () => {
  it("shows only while a block is selected and the editor is editable", async () => {
    const editable = await mount(paragraph("First"), titled("plain", "A"));
    expect(toolbar()).toBeNull();

    await select(editable.editor, 1);
    expect(toolbar()?.getAttribute("data-slot")).toBe("block-toolbar");

    editable.editor().commands.setTextSelection(2);
    await flushPromises();
    expect(toolbar()).toBeNull();
    unmountAll();

    const readOnly = await mountBlockEditor(
      { blocks, readOnly: true },
      stored(paragraph("First"), titled("plain", "A")),
    );
    await select(readOnly.editor, 1);
    expect(toolbar()).toBeNull();
  });

  it("offers Configure only for a block that has a config", async () => {
    const mounted = await mount(titled("plain", "A"), titled("note", "B"));
    await select(mounted.editor, 0);
    expect(document.querySelector('button[aria-label="Configure"]')).toBeNull();
    await select(mounted.editor, 1);
    expect(buttonOf("Configure")).toBeTruthy();
  });

  it("duplicate, move up, move down and delete change the document", async () => {
    const mounted = await mount(
      titled("note", "A"),
      paragraph("Between"),
      titled("plain", "B"),
      titled("plain", "C"),
    );
    await select(mounted.editor, 0);
    buttonOf("Duplicate").click();
    await flushPromises();
    expect(content(mounted)).toEqual([
      titled("note", "A"),
      titled("note", "A"),
      paragraph("Between"),
      titled("plain", "B"),
      titled("plain", "C"),
    ]);

    // The copy is selected, so the bar acts on it next.
    buttonOf("Move down").click();
    await flushPromises();
    expect(content(mounted)?.map((node) => node.type)).toEqual([
      "note",
      "paragraph",
      "note",
      "plain",
      "plain",
    ]);

    buttonOf("Move up").click();
    await flushPromises();
    expect(content(mounted)?.map((node) => node.type)).toEqual([
      "note",
      "note",
      "paragraph",
      "plain",
      "plain",
    ]);

    await select(mounted.editor, 4);
    buttonOf("Delete").click();
    await flushPromises();
    expect(titles(content(mounted))).toEqual(["A", "A", "paragraph", "B"]);
  });

  it("move up and move down are disabled at the ends", async () => {
    // A top-level block always has the editor's closing paragraph after it, so the ends are inside a box.
    const boxed = await mount({
      type: "box",
      attrs: { title: "Box" },
      content: [titled("plain", "A"), titled("plain", "B")],
    });
    // 0 is the box, 1 its first child.
    boxed.editor().commands.setNodeSelection(1);
    await flushPromises();
    expect(buttonOf("Move up").disabled).toBe(true);
    expect(buttonOf("Move down").disabled).toBe(false);

    const second =
      1 + (boxed.editor().state.doc.firstChild?.child(0).nodeSize ?? 0);
    boxed.editor().commands.setNodeSelection(second);
    await flushPromises();
    expect(buttonOf("Move up").disabled).toBe(false);
    expect(buttonOf("Move down").disabled).toBe(true);
  });

  it("acts on the block that holds the caret, as well as on a selected block", async () => {
    const boxed: BlockDocNode = {
      type: "box",
      attrs: { title: "Boxed" },
      content: [paragraph("Inside")],
    };
    const mounted = await mount(paragraph("Before"), boxed);
    expect(toolbar()).toBeNull();
    // Inside the box's paragraph: 7 is the box, 8 its paragraph, 9 the first letter.
    mounted.editor().commands.setTextSelection(10);
    await flushPromises();
    expect(toolbar()).not.toBeNull();
    buttonOf("Duplicate").click();
    await flushPromises();
    expect(content(mounted)).toEqual([paragraph("Before"), boxed, boxed]);
  });

  it("the auto config form writes an enum, a boolean, a number and a string", async () => {
    const mounted = await mount(titled("note", "A"));
    await select(mounted.editor, 0);
    buttonOf("Configure").click();
    await flushPromises();
    expect(document.querySelector('[data-slot="block-config"]')).not.toBeNull();

    const tone = elementOf(controlOf("Tone"), HTMLSelectElement);
    tone.value = "warn";
    tone.dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();

    const pinned = elementOf(controlOf("Pinned"), HTMLInputElement);
    expect(pinned.getAttribute("role")).toBe("switch");
    pinned.click();
    await flushPromises();

    for (const [label, value] of [
      ["Size", "3"],
      ["Title", "Hello"],
    ] as const) {
      const input = elementOf(controlOf(label), HTMLInputElement);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await flushPromises();
    }
    expect(elementOf(controlOf("Size"), HTMLInputElement).type).toBe("number");
    // A key the form cannot edit gets no control.
    expect(
      [...document.querySelectorAll("label")].some(
        (label) => label.textContent === "Extra",
      ),
    ).toBe(false);

    expect(content(mounted)).toEqual([
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

    const size = elementOf(controlOf("Size"), HTMLInputElement);
    size.value = "";
    size.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(content(mounted)?.[0]?.attrs?.size).toBeNull();
  });

  it("a config field keeps the focus while it patches the block", async () => {
    const mounted = await mount(titled("note", "A"));
    await select(mounted.editor, 0);
    buttonOf("Configure").click();
    await flushPromises();
    const title = elementOf(controlOf("Title"), HTMLInputElement);
    title.focus();
    for (const value of ["a", "ab"]) {
      title.value = value;
      title.dispatchEvent(new Event("input", { bubbles: true }));
      await flushPromises();
      expect(document.activeElement).toBe(title);
    }
    expect(content(mounted)?.[0]?.attrs?.title).toBe("ab");
  });

  it("Configure toggles the panel", async () => {
    const mounted = await mount(titled("note", "A"));
    await select(mounted.editor, 0);
    const panel = () => document.querySelector('[data-slot="block-config"]');
    expect(panel()).toBeNull();
    buttonOf("Configure").click();
    await flushPromises();
    expect(panel()).not.toBeNull();
    buttonOf("Configure").click();
    await flushPromises();
    expect(panel()).toBeNull();
  });

  it("the config panel does not open itself on another block", async () => {
    const mounted = await mount(
      titled("note", "A"),
      paragraph("Between"),
      titled("note", "B"),
    );
    await select(mounted.editor, 0);
    buttonOf("Configure").click();
    await flushPromises();
    mounted.editor().commands.setTextSelection(1);
    await flushPromises();
    expect(toolbar()).toBeNull();
    await select(mounted.editor, 2);
    expect(buttonOf("Configure").getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector('[data-slot="block-config"]')).toBeNull();
  });
});
