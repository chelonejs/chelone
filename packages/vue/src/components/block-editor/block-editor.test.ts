import {
  type BlockDocNode,
  createI18n,
  defineMessages,
  fakeDataProvider,
  isBlockDoc,
  required,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { Editor } from "@tiptap/core";
import { flushPromises, mount } from "@vue/test-utils";
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { defineComponent, h, type PropType, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import BlockDocField from "./block-doc-field.vue";
import BlockEditorInput, {
  type BlockEditorInputProps,
} from "./block-editor-input.vue";
import { type BlockRenderProps, defineBlock } from "./block-nodes";

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

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const paragraph = (text: string): BlockDocNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const doc = (...content: BlockDocNode[]): BlockDocNode => ({
  type: "doc",
  content,
});

interface FormValues {
  // `BlockDocNode` is recursive, which form-core's path types cannot follow.
  body: object | null;
}

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
  render: ({ attrs, mode }: BlockRenderProps) =>
    h(
      "aside",
      { "data-testid": "callout", "data-mode": mode, "data-tone": attrs.tone },
      String(attrs.text),
    ),
  read: ({ attrs }: BlockRenderProps) =>
    h("aside", { "data-testid": "callout-read" }, `Read: ${attrs.text}`),
});

const counter = defineBlock({
  name: "counter",
  label: "Counter",
  group: "Data",
  schema: z.object({ start: z.number().default(0) }),
  render: ({ attrs }: BlockRenderProps) =>
    h("span", `Count from ${attrs.start}`),
});

const blocks = [callout, counter];

const messages = defineMessages({ "chelone.validation.required": "Required" });

function mountUnderAdmin(child: () => VNodeChild) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
            i18n: createI18n({ locale: "en", messages: { en: messages } }),
          },
          { default: child },
        ),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  mounted.push(wrapper);
  return wrapper;
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
  { body = null }: { body?: object | null } = {},
) {
  const captured: { form?: UseFormReturn<FormValues> } = {};
  const onSubmit: Mock<(data: FormValues) => Promise<undefined>> = vi.fn(
    async () => undefined,
  );
  const wrapper = mountUnderAdmin(() =>
    h(
      defineComponent({
        setup() {
          captured.form = useForm<FormValues>({ record: { body }, onSubmit });
          return () =>
            h(BlockEditorInput, { source: "body", blocks, ...props });
        },
      }),
    ),
  );
  await vi.waitFor(() =>
    expect(wrapper.find('[role="textbox"]').exists()).toBe(true),
  );
  await flushPromises();
  const textbox = elementOf(
    wrapper.get('[role="textbox"]').element,
    HTMLElement,
  );
  return {
    wrapper,
    form: defined(captured.form),
    onSubmit,
    dom: () => textbox,
    editor: () => editorOf(textbox),
  };
}

const options = () => [...document.querySelectorAll('[role="option"]')];
const picker = () =>
  document.querySelector('[data-slot="block-editor-picker"]');
const written = (onSubmit: Mock<(data: FormValues) => Promise<undefined>>) => {
  const body = onSubmit.mock.calls[0]?.[0].body;
  return isBlockDoc(body) ? body : null;
};

describe("BlockEditorInput", () => {
  it("renders the stored document", async () => {
    const { dom } = await mountInput(
      {},
      {
        body: doc(
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Title" }],
          },
          paragraph("Hello world"),
        ),
      },
    );
    expect(dom().querySelector("h2")?.textContent).toBe("Title");
    expect(dom().textContent).toContain("Hello world");
  });

  it("writes the document JSON to the form on edit", async () => {
    const { editor, form } = await mountInput();
    editor().commands.setContent(doc(paragraph("Typed")), { emitUpdate: true });
    await flushPromises();
    expect(form.values.value.body).toEqual(doc(paragraph("Typed")));
  });

  it("writes null for an empty document, so required fails on submit", async () => {
    const { editor, form, onSubmit, wrapper } = await mountInput(
      { validate: required() },
      { body: doc(paragraph("Some text")) },
    );
    editor().commands.clearContent(true);
    await flushPromises();
    expect(form.values.value.body).toBeNull();
    await form.submit();
    await flushPromises();
    expect(wrapper.get('[data-slot="field-error"]').text()).toContain(
      "Required",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("replaces the content when the form value changes from outside, without writing back", async () => {
    const { form, dom } = await mountInput(
      {},
      { body: doc(paragraph("First")) },
    );
    const next = doc(paragraph("Second"));
    form.form.setFieldValue("body", next);
    await flushPromises();
    expect(dom().textContent).toContain("Second");
    expect(dom().textContent).not.toContain("First");
    // A write back would store the editor's own JSON, a new object.
    expect(form.form.getFieldValue("body")).toBe(next);
  });

  it("renders a defineBlock block with its attributes in edit mode", async () => {
    const { dom } = await mountInput(
      {},
      {
        body: doc({
          type: "callout",
          attrs: { tone: "warn", text: "Careful" },
        }),
      },
    );
    const wrapper = elementOf(
      dom().querySelector('[data-block="callout"]'),
      HTMLElement,
    );
    const view = elementOf(
      wrapper.querySelector('[data-testid="callout"]'),
      HTMLElement,
    );
    expect(view.textContent).toBe("Careful");
    expect(view.getAttribute("data-tone")).toBe("warn");
    expect(view.getAttribute("data-mode")).toBe("edit");
  });

  it("typing a slash opens the picker, and choosing a block inserts it with its defaults", async () => {
    const { editor, dom, form, onSubmit } = await mountInput();
    editor().commands.focus();
    editor().commands.insertContent("/call");
    await vi.waitFor(() => expect(picker()).not.toBeNull());
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    expect(options()[0]?.textContent).toContain("Callout");
    expect(options()[0]?.textContent).toContain("Highlight a note");

    options()[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();
    await form.submit();
    await flushPromises();

    expect(written(onSubmit)?.content?.[0]).toEqual({
      type: "callout",
      attrs: { tone: "info", text: "" },
    });
    expect(JSON.stringify(written(onSubmit))).not.toContain("/call");
    expect(dom().querySelector('[data-block="callout"]')).not.toBeNull();
    expect(picker()).toBeNull();
  });

  it("Escape closes the picker without inserting", async () => {
    const { editor, dom, form, onSubmit } = await mountInput();
    editor().commands.focus();
    editor().commands.insertContent("/");
    await vi.waitFor(() => expect(picker()).not.toBeNull());
    dom().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await vi.waitFor(() => expect(picker()).toBeNull());
    await form.submit();
    await flushPromises();
    expect(JSON.stringify(written(onSubmit))).not.toContain("callout");
    expect(dom().querySelector("[data-block]")).toBeNull();
  });

  it("keeps an unknown node and writes it back unchanged on the next edit", async () => {
    const mystery: BlockDocNode = {
      type: "mystery",
      attrs: { nested: { a: [1, 2] } },
      content: [paragraph("inside")],
    };
    const { editor, dom, form, onSubmit } = await mountInput(
      {},
      { body: doc(mystery, paragraph("After")) },
    );
    expect(dom().textContent).toContain(
      "Unknown block: mystery. It is kept on save.",
    );
    const end = editor().state.doc.content.size - 1;
    editor().commands.insertContentAt(end, "!");
    await flushPromises();
    await form.submit();
    await flushPromises();
    expect(written(onSubmit)).toEqual(doc(mystery, paragraph("After!")));
  });

  it("shows hostile stored content as text", async () => {
    const { dom } = await mountInput(
      {},
      {
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

describe("BlockDocField", () => {
  it("renders the document read-only with the read component of a block", async () => {
    const stored = doc(paragraph("Intro"), {
      type: "callout",
      attrs: { tone: "warn", text: "Careful" },
    });
    const wrapper = mountUnderAdmin(() =>
      h(BlockDocField, {
        source: "body",
        record: { id: 1, body: stored },
        blocks,
      }),
    );
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="callout-read"]').exists()).toBe(true),
    );
    expect(wrapper.get('[data-testid="callout-read"]').text()).toBe(
      "Read: Careful",
    );
    expect(wrapper.find('[data-testid="callout"]').exists()).toBe(false);
    const textbox = wrapper.get('[role="textbox"]');
    expect(textbox.attributes("contenteditable")).toBe("false");
    expect(textbox.text()).toContain("Intro");
    expect(document.querySelector('[data-slot="block-editor-add"]')).toBeNull();
  });
});
