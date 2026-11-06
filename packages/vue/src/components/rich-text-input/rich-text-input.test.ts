import { required, richTextToolbarItems } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import StarterKit from "@tiptap/starter-kit";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { mountInput } from "./__fixtures__/rich-text-harness";

type Mounted = Awaited<ReturnType<typeof mountInput>>;

const button = ({ wrapper }: Mounted, name: string) =>
  elementOf(
    wrapper.get(`button[aria-label="${name}"]`).element,
    HTMLButtonElement,
  );

describe("RichTextInput", () => {
  it("renders the initial HTML value", async () => {
    const { dom, wrapper } = await mountInput(
      {},
      {
        body: "<p>Hello <strong>world</strong></p>",
      },
    );
    expect(dom().querySelector("p")?.textContent).toBe("Hello world");
    expect(dom().querySelector("strong")?.textContent).toBe("world");
    expect(dom().classList.contains("rich-text")).toBe(true);
    expect(wrapper.find('[data-slot="rich-text-input"]').exists()).toBe(true);
  });

  it("renders a custom label and helper text, and names the textbox with the label", async () => {
    const { wrapper, dom } = await mountInput({
      label: "Article body",
      helperText: "Shown on the page",
    });
    const label = wrapper.get("label");
    expect(label.text()).toContain("Article body");
    expect(wrapper.text()).toContain("Shown on the page");
    const target = document.getElementById(defined(label.attributes("for")));
    expect(target?.contains(dom())).toBe(true);
    expect(dom().getAttribute("aria-labelledby")).toBe(label.attributes("id"));
  });

  it("focuses the editor when the label is clicked", async () => {
    const { wrapper, dom } = await mountInput({ label: "Article body" });
    await wrapper.get("label").trigger("click");
    // tiptap focuses in an animation frame.
    await vi.waitFor(() => expect(document.activeElement).toBe(dom()));
  });

  it("is not editable when disabled or readOnly", async () => {
    const first = await mountInput({ disabled: true });
    expect(first.dom().getAttribute("contenteditable")).toBe("false");
    expect(first.editor().isEditable).toBe(false);

    const second = await mountInput({ readOnly: true });
    expect(second.dom().getAttribute("contenteditable")).toBe("false");

    const third = await mountInput({});
    expect(third.dom().getAttribute("contenteditable")).toBe("true");
  });

  it("follows a placeholder that changes after mount", async () => {
    const { dom, setProps } = await mountInput({ placeholder: "First" });
    const shown = () =>
      dom().querySelector("p")?.getAttribute("data-placeholder");
    expect(shown()).toBe("First");
    setProps({ placeholder: "Second" });
    await vi.waitFor(() => expect(shown()).toBe("Second"));
  });

  it("disables and re-enables the toolbar when disabled changes after mount", async () => {
    const mountedInput = await mountInput({});
    const { dom, setProps } = mountedInput;
    expect(button(mountedInput, "Bold").disabled).toBe(false);
    setProps({ disabled: true });
    await vi.waitFor(() =>
      expect(button(mountedInput, "Bold").disabled).toBe(true),
    );
    expect(dom().getAttribute("contenteditable")).toBe("false");
    setProps({ disabled: false });
    await vi.waitFor(() =>
      expect(button(mountedInput, "Bold").disabled).toBe(false),
    );
    expect(dom().getAttribute("contenteditable")).toBe("true");
  });

  it("shows the required error on submit when the editor is empty", async () => {
    const { form, wrapper } = await mountInput({ validate: required() });
    expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
    await form.submit();
    await flushPromises();
    expect(wrapper.get('[data-slot="field-error"]').text()).toContain(
      "Required",
    );
  });

  it("writes the editor HTML to the form on change, and an empty string when cleared", async () => {
    const { editor, form } = await mountInput({}, { body: "" });
    editor().commands.setContent("<p>Typed</p>", { emitUpdate: true });
    await nextTick();
    expect(form.values.value.body).toBe("<p>Typed</p>");

    editor().commands.clearContent(true);
    await nextTick();
    expect(form.values.value.body).toBe("");
  });

  it("replaces the content when the form value changes from outside, without writing back", async () => {
    const onUpdate = vi.fn();
    const { form, dom } = await mountInput(
      { editorOptions: { onUpdate } },
      { body: "<p>First</p>" },
    );
    form.form.setFieldValue("body", "<h2>Second</h2>");
    await flushPromises();
    expect(dom().querySelector("h2")?.textContent).toBe("Second");
    expect(dom().textContent).not.toContain("First");
    expect(onUpdate).not.toHaveBeenCalled();
    expect(form.values.value.body).toBe("<h2>Second</h2>");
  });

  it("keeps the editor when the form value is echoed back", async () => {
    const onCreate = vi.fn();
    const { editor, dom } = await mountInput(
      { editorOptions: { onCreate } },
      { body: "<p>Hello world</p>" },
    );
    const before = dom();
    editor().commands.setTextSelection(4);
    editor().commands.insertContent("!");
    await flushPromises();
    expect(dom()).toBe(before);
    expect(dom().textContent).toBe("Hel!lo world");
    expect(editor().state.selection.from).toBe(5);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("marks the field touched on blur", async () => {
    const { form, dom } = await mountInput();
    expect(form.form.getFieldMeta("body")?.isTouched).toBeFalsy();
    dom().focus();
    dom().blur();
    await flushPromises();
    expect(form.form.getFieldMeta("body")?.isTouched).toBe(true);
  });

  it("editorOptions.extensions replaces the default extensions", async () => {
    const { dom } = await mountInput(
      {
        editorOptions: { extensions: [StarterKit.configure({ bold: false })] },
      },
      { body: "<p><strong>Bold</strong> text</p>" },
    );
    expect(dom().textContent).toBe("Bold text");
    expect(dom().querySelector("strong")).toBeNull();
  });

  it("the bold button toggles bold and reports it with aria-pressed", async () => {
    const mountedInput = await mountInput({}, { body: "<p>hello</p>" });
    const { editor } = mountedInput;
    editor().commands.selectAll();
    await nextTick();
    expect(button(mountedInput, "Bold").getAttribute("aria-pressed")).toBe(
      "false",
    );
    button(mountedInput, "Bold").click();
    await nextTick();
    expect(editor().getHTML()).toBe("<p><strong>hello</strong></p>");
    expect(button(mountedInput, "Bold").getAttribute("aria-pressed")).toBe(
      "true",
    );
    button(mountedInput, "Bold").click();
    await nextTick();
    expect(editor().getHTML()).toBe("<p>hello</p>");
    expect(button(mountedInput, "Bold").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("the block type select turns a paragraph into a heading", async () => {
    const { editor, wrapper } = await mountInput({}, { body: "<p>hello</p>" });
    const select = elementOf(
      wrapper.get('select[aria-label="Block type"]').element,
      HTMLSelectElement,
    );
    expect(select.value).toBe("paragraph");
    await wrapper.get('select[aria-label="Block type"]').setValue("heading2");
    // StarterKit keeps an empty paragraph after a last-block heading.
    expect(editor().getHTML()).toContain("<h2>hello</h2>");
    expect(select.value).toBe("heading2");
    await wrapper.get('select[aria-label="Block type"]').setValue("paragraph");
    expect(editor().getHTML()).toContain("<p>hello</p>");
    expect(editor().getHTML()).not.toContain("<h2>");
  });

  it("the link form applies an https link and removes it with an empty URL", async () => {
    const mountedInput = await mountInput({}, { body: "<p>hello</p>" });
    const { editor, wrapper } = mountedInput;
    editor().commands.selectAll();
    await nextTick();
    button(mountedInput, "Link").click();
    await nextTick();
    const urlInput = wrapper.get('[data-slot="rich-text-link-form"] input');
    await urlInput.setValue("https://example.com");
    await wrapper
      .get('[data-slot="rich-text-link-form"] button[type="button"]')
      .trigger("click");
    expect(editor().getHTML()).toContain('href="https://example.com"');
    expect(editor().getHTML()).toContain(">hello</a>");
    expect(wrapper.find('[data-slot="rich-text-link-form"]').exists()).toBe(
      false,
    );

    // The form opens on the link under the cursor, and an empty URL removes it.
    editor().commands.setTextSelection(3);
    await nextTick();
    button(mountedInput, "Link").click();
    await nextTick();
    const reopened = wrapper.get('[data-slot="rich-text-link-form"] input');
    expect(elementOf(reopened.element, HTMLInputElement).value).toBe(
      "https://example.com",
    );
    await reopened.setValue("");
    await wrapper
      .get('[data-slot="rich-text-link-form"] button[type="button"]')
      .trigger("click");
    expect(editor().getHTML()).toBe("<p>hello</p>");
  });

  it("the link form rejects a javascript URL and writes nothing", async () => {
    const mountedInput = await mountInput({}, { body: "<p>hello</p>" });
    const { editor, wrapper, form } = mountedInput;
    editor().commands.selectAll();
    await nextTick();
    button(mountedInput, "Link").click();
    await nextTick();
    await wrapper
      .get('[data-slot="rich-text-link-form"] input')
      .setValue("java\tscript:alert(1)");
    await wrapper
      .get('[data-slot="rich-text-link-form"] button[type="button"]')
      .trigger("click");
    expect(
      wrapper.get('[data-slot="rich-text-link-form"] [role="alert"]').text(),
    ).toBe("Enter a web, mail or phone link");
    expect(editor().getHTML()).toBe("<p>hello</p>");
    expect(form.values.value.body).toBe("<p>hello</p>");
  });

  it("disables the toolbar while the editor is not editable", async () => {
    const mountedInput = await mountInput({}, { body: "<p>hello</p>" });
    // Nothing to undo yet, so undo is disabled even while editable.
    expect(button(mountedInput, "Undo").disabled).toBe(true);
    expect(button(mountedInput, "Bold").disabled).toBe(false);
    mountedInput.editor().commands.insertContent("!");
    await nextTick();
    expect(button(mountedInput, "Undo").disabled).toBe(false);
    expect(button(mountedInput, "Redo").disabled).toBe(true);

    const readOnly = await mountInput({ readOnly: true });
    const buttons = readOnly.wrapper.findAll('[role="toolbar"] button');
    expect(buttons.length).toBeGreaterThan(10);
    for (const each of buttons) {
      expect(elementOf(each.element, HTMLButtonElement).disabled).toBe(true);
    }
    expect(
      elementOf(
        readOnly.wrapper.get('select[aria-label="Block type"]').element,
        HTMLSelectElement,
      ).disabled,
    ).toBe(true);
  });

  it("lists the buttons in the order core documents", async () => {
    const { wrapper } = await mountInput();
    const names = wrapper
      .findAll('[role="toolbar"] button')
      .map((each) => each.attributes("aria-label"));
    expect(names).toEqual(
      richTextToolbarItems.flatMap((item) =>
        item.id === "link" ? [item.defaultLabel, "Image"] : [item.defaultLabel],
      ),
    );
  });

  it("the toolbar slot replaces the default toolbar", async () => {
    const { wrapper, editor } = await mountInput(
      {},
      {
        slots: {
          toolbar: ({ editor: slotEditor }) =>
            h(
              "div",
              { "data-testid": "custom-toolbar" },
              String(slotEditor.isEditable),
            ),
        },
      },
    );
    expect(wrapper.get('[data-testid="custom-toolbar"]').text()).toBe("true");
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Bold"]').exists()).toBe(false);
    expect(editor().isEditable).toBe(true);
  });

  // Vue treats slot content that renders nothing as absent and shows the
  // fallback, so an empty `#toolbar` keeps the default toolbar. There is no
  // Vue equivalent of React's `toolbar={null}`.
  it("keeps the default toolbar when the toolbar slot renders nothing", async () => {
    const { wrapper } = await mountInput({}, { slots: { toolbar: () => [] } });
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Bold"]').exists()).toBe(true);
  });

  it("drops the toolbar buttons when the toolbar slot renders an empty element", async () => {
    const { wrapper } = await mountInput(
      {},
      { slots: { toolbar: () => h("span") } },
    );
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Bold"]').exists()).toBe(false);
  });

  it("drops hostile markup from a stored value", async () => {
    const hostile = [
      "<img src=x onerror=alert(1)>",
      "<script>alert(1)</script>",
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(1)">x</a>',
      "<p>kept</p>",
    ].join("");
    const { editor, dom, form } = await mountInput({}, { body: hostile });
    expect(dom().querySelector("script, iframe")).toBeNull();
    expect(dom().querySelector("a[href^='javascript']")).toBeNull();
    for (const node of dom().querySelectorAll("*")) {
      expect(
        node.getAttributeNames().filter((name) => name.startsWith("on")),
      ).toEqual([]);
    }
    editor().commands.insertContent("!");
    await nextTick();
    const written = form.values.value.body;
    expect(written).toContain("kept");
    expect(written).not.toMatch(/<script|<iframe|onerror|javascript:/i);
    expect(dom().querySelector("img")?.getAttribute("src")).toBe("x");
  });
});
