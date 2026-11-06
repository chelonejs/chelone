import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../context";
import { RecordContextProvider } from "../../record/record-context";
import { mountUnderForm } from "./__fixtures__/rich-text-harness";
import { RichTextField } from "./rich-text-field";
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

async function mountInput(props: Partial<RichTextInputProps> = {}, body = "") {
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
  return Object.assign(() => defined(created.editor), {
    /** What the form would save. */
    value: () => form().form.getFieldValue("body"),
  });
}

const colorButton = () => screen.getByRole("button", { name: "Text color" });

function openPanel() {
  fireEvent.click(colorButton());
  return defined(
    document.querySelector<HTMLElement>('[data-slot="rich-text-color"]'),
  );
}

function wrapRecord(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
}

describe("rich text color", () => {
  it("a swatch colors the selection and reports it with aria-pressed", async () => {
    const editor = await mountInput({}, "<p>hello</p>");
    editor().commands.selectAll();
    const panel = openPanel();
    const blue = within(panel).getByRole("button", { name: "Bright blue" });
    expect(blue.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(blue);

    expect(editor().getHTML()).toBe(
      '<p><span style="color: var(--rich-text-color-bright-blue);">hello</span></p>',
    );
    await waitFor(() =>
      expect(
        within(panel)
          .getByRole("button", { name: "Bright blue" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    expect(
      within(panel)
        .getByRole("button", { name: "Soft blue" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(editor().getHTML()).not.toContain("hljs");
  });

  it("Default clears the color", async () => {
    const editor = await mountInput(
      {},
      '<p><span style="color: var(--rich-text-color-bright-red)">hello</span></p>',
    );
    editor().commands.selectAll();
    const panel = openPanel();
    await waitFor(() =>
      expect(
        within(panel)
          .getByRole("button", { name: "Bright red" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );

    fireEvent.click(within(panel).getByRole("button", { name: "Default" }));

    expect(editor().getHTML()).toBe("<p>hello</p>");
    await waitFor(() =>
      expect(
        within(panel)
          .getByRole("button", { name: "Default" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
  });

  it("Enter ends the color for the next line", async () => {
    const editor = await mountInput(
      {},
      '<p><span style="color: var(--rich-text-color-bright-red);">first</span></p>',
    );
    editor().commands.focus("end");

    // A real key event, since the keyboardShortcut command skips the stored marks.
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
    });
    editor().commands.insertContent({ type: "text", text: "second" });

    expect(editor().getHTML()).toBe(
      '<p><span style="color: var(--rich-text-color-bright-red);">first</span></p><p>second</p>',
    );
  });

  it("colors false leaves out the button", async () => {
    const editor = await mountInput({ colors: false }, "<p>hello</p>");
    expect(screen.queryByRole("button", { name: "Text color" })).toBeNull();
    expect(editor().schema.marks.textStyle).toBeUndefined();
  });

  it("the field keeps a palette color and drops hostile styles", () => {
    const { container } = render(<RichTextField source="body" />, {
      wrapper: wrapRecord({
        id: 1,
        body: [
          '<p><span style="color: var(--rich-text-color-bright-blue)">ok</span></p>',
          '<p style="position:fixed">fixed</p>',
          '<p><span style="color: red; background: url(javascript:alert(1))">bg</span></p>',
          '<p><span style="color: expression(alert(1))">expr</span></p>',
        ].join(""),
      }),
    });
    const root = defined(
      container.querySelector('[data-slot="rich-text-field"]'),
    );
    const styled = [...root.querySelectorAll("[style]")];
    expect(styled.map((node) => node.textContent)).toEqual(["ok"]);
    expect(styled[0]?.getAttribute("style")).toBe(
      "color: var(--rich-text-color-bright-blue)",
    );
    expect(root.textContent).toBe("okfixedbgexpr");
  });
});
