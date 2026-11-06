import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import type { ReactNode } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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

let blobCount = 0;
let revokeObjectURL: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  blobCount = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:test/${++blobCount}`,
  );
  revokeObjectURL = vi
    .spyOn(URL, "revokeObjectURL")
    .mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mountInput(props: Partial<RichTextInputProps> = {}, body = "") {
  const created: { editor: Editor | null } = { editor: null };
  mountUnderForm<{ body: string }>(
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

const png = (name = "cat.png", size = 4) =>
  new File([new Uint8Array(size)], name, { type: "image/png" });

function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "Image" }));
  return defined(
    document.querySelector<HTMLElement>('[data-slot="rich-text-image-form"]'),
  );
}

function fileInput() {
  return elementOf(
    defined(
      document.querySelector(
        '[data-slot="rich-text-image-form"] input[type="file"]',
      ),
    ),
    HTMLInputElement,
  );
}

function chooseFiles(...files: File[]) {
  fireEvent.change(fileInput(), { target: { files } });
}

const images = () => [...document.querySelectorAll("img")];

/** A promise the test settles by hand. */
function deferred<T>() {
  const handle: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  } = { resolve: () => {}, reject: () => {} };
  const promise = new Promise<T>((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return { promise, ...handle };
}

describe("rich text images", () => {
  it("inserts an image from an https URL", async () => {
    const editor = await mountInput();
    const form = openForm();
    fireEvent.change(within(form).getByRole("textbox", { name: "Image URL" }), {
      target: { value: "https://example.com/cat.png" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Apply" }));

    expect(editor().getHTML()).toContain('src="https://example.com/cat.png"');
    await waitFor(() =>
      expect(images().map((img) => img.getAttribute("src"))).toEqual([
        "https://example.com/cat.png",
      ]),
    );
    expect(
      document.querySelector('[data-slot="rich-text-image-form"]'),
    ).toBeNull();
  });

  it("rejects a javascript or svg data URL in the image form", async () => {
    const editor = await mountInput();
    const form = openForm();
    const input = within(form).getByRole("textbox", { name: "Image URL" });
    for (const hostile of [
      "javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
    ]) {
      fireEvent.change(input, { target: { value: hostile } });
      fireEvent.click(within(form).getByRole("button", { name: "Apply" }));
      expect(within(form).getByRole("alert").textContent).toBe(
        "Enter a link to an image",
      );
      expect(editor().getHTML()).not.toContain("<img");
      expect(images()).toEqual([]);
    }
  });

  it("uploads a file and stores the URL uploadFn returns", async () => {
    const upload = deferred<{ id: number; src: string }>();
    const uploadFn = vi.fn(() => upload.promise);
    const editor = await mountInput({ images: { uploadFn } });
    openForm();
    expect(fileInput().accept).toBe("image/*");
    expect(fileInput().multiple).toBe(true);
    const file = png();
    chooseFiles(file);

    // The file shows at once from its blob URL, with a spinner over it.
    expect(uploadFn).toHaveBeenCalledWith(file);
    await waitFor(() =>
      expect(images().map((img) => img.getAttribute("src"))).toEqual([
        "blob:test/1",
      ]),
    );
    expect(screen.getByRole("status")).toBeTruthy();

    await act(async () => {
      upload.resolve({ id: 7, src: "https://cdn.example.com/cat.png" });
    });
    await waitFor(() =>
      expect(images().map((img) => img.getAttribute("src"))).toEqual([
        "https://cdn.example.com/cat.png",
      ]),
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(editor().getHTML()).toContain(
      'src="https://cdn.example.com/cat.png"',
    );
    expect(editor().getHTML()).toContain('data-id="7"');
    expect(editor().getHTML()).toContain('data-file-name="cat.png"');
    expect(editor().getHTML()).not.toContain("blob:");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("shows the error state when uploadFn throws or returns an unsafe URL", async () => {
    const onImageError = vi.fn();
    const uploadFn = vi
      .fn<(file: File) => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("javascript:alert(1)");
    const editor = await mountInput({ images: { uploadFn, onImageError } });
    openForm();
    chooseFiles(png("a.png"), png("b.png"));

    await waitFor(() =>
      expect(
        document.querySelectorAll('[data-slot="rich-text-image-error"]'),
      ).toHaveLength(2),
    );
    expect(onImageError).toHaveBeenCalledTimes(2);
    expect(onImageError.mock.calls.map(([error]) => error.reason)).toEqual([
      "upload",
      "upload",
    ]);
    expect(images()).toEqual([]);
    expect(editor().getHTML()).not.toContain("blob:");
    expect(editor().getHTML()).not.toContain("javascript:");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/2");
  });

  it("stores a data URL without uploadFn, and rejects a file over the limit", async () => {
    const onImageError = vi.fn();
    const editor = await mountInput({
      images: { maxFileSize: 10, onImageError },
    });
    openForm();
    const tooBig = png("big.png", 11);
    const text = new File(["x"], "note.txt", { type: "text/plain" });
    chooseFiles(tooBig, text, png("small.png", 4));

    await waitFor(() =>
      expect(editor().getHTML()).toContain('src="data:image/png;base64,'),
    );
    expect(editor().getHTML().match(/<img/g)).toHaveLength(1);
    expect(editor().getHTML()).not.toContain("blob:");
    expect(
      onImageError.mock.calls.map(([error]) => [error.reason, error.file]),
    ).toEqual([
      ["size", tooBig],
      ["type", text],
    ]);
  });

  it("shows the error state without uploadFn when base64 is off", async () => {
    const editor = await mountInput({ images: { allowBase64: false } });
    openForm();
    chooseFiles(png());
    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="rich-text-image-error"]'),
      ).not.toBeNull(),
    );
    expect(editor().getHTML()).not.toContain("data:");
    expect(editor().getHTML()).not.toContain("blob:");
  });

  it("removing an image revokes its blob URL", async () => {
    const uploadFn = vi.fn(() => new Promise<string>(() => {}));
    const editor = await mountInput({ images: { uploadFn } });
    openForm();
    chooseFiles(png());
    expect(revokeObjectURL).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove image" }),
    );
    expect(editor().getHTML()).not.toContain("<img");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("the arrow keys on a handle resize within the limits", async () => {
    // jsdom has no layout, so the editor is 300px wide.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const editor = await mountInput(
      {},
      '<img src="https://example.com/a.png" width="200">',
    );
    await screen.findByRole("button", { name: "View image" });
    expect(screen.queryByRole("button", { name: /^Resize image/ })).toBeNull();
    act(() => {
      editor().commands.setNodeSelection(0);
    });
    const right = await screen.findByRole("button", {
      name: "Resize image from the right edge",
    });
    const left = screen.getByRole("button", {
      name: "Resize image from the left edge",
    });
    const width = () => editor().getAttributes("image").width;

    fireEvent.keyDown(right, { key: "ArrowRight" });
    expect(width()).toBe(210);
    fireEvent.keyDown(left, { key: "ArrowLeft" });
    expect(width()).toBe(220);
    fireEvent.keyDown(right, { key: "ArrowLeft" });
    expect(width()).toBe(210);

    for (let i = 0; i < 20; i++)
      fireEvent.keyDown(right, { key: "ArrowRight" });
    expect(width()).toBe(300);
    for (let i = 0; i < 40; i++) fireEvent.keyDown(right, { key: "ArrowLeft" });
    expect(width()).toBe(60);
    await waitFor(() => expect(images()[0]?.getAttribute("width")).toBe("60"));
  });

  it("a pointer drag on a handle resizes the image", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const editor = await mountInput(
      {},
      '<img src="https://example.com/a.png" width="200">',
    );
    act(() => {
      editor().commands.setNodeSelection(0);
    });
    const right = await screen.findByRole("button", {
      name: "Resize image from the right edge",
    });
    fireEvent.pointerDown(right, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 140 });
    fireEvent.pointerUp(window, { clientX: 140 });
    expect(editor().getAttributes("image").width).toBe(240);

    const left = screen.getByRole("button", {
      name: "Resize image from the left edge",
    });
    fireEvent.pointerDown(left, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 900 });
    fireEvent.pointerUp(window, { clientX: 900 });
    expect(editor().getAttributes("image").width).toBe(60);
  });

  it("view opens and Escape closes the overlay, and remove deletes the image", async () => {
    const editor = await mountInput(
      {},
      '<img src="https://example.com/a.png" alt="A cat">',
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "View image" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("img").getAttribute("src")).toBe(
      "https://example.com/a.png",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View image" }));
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(editor().getHTML()).not.toContain("<img");
    expect(images()).toEqual([]);
  });

  it("copy link writes the source to the clipboard", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await mountInput({}, '<img src="https://example.com/a.png">');
    fireEvent.click(await screen.findByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith("https://example.com/a.png");
  });

  it("download saves the image under its alt text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("x", { headers: { "content-type": "image/jpeg" } }),
      ),
    );
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    await mountInput({}, '<img src="https://example.com/a.jpg" alt="A cat">');
    fireEvent.click(
      await screen.findByRole("button", { name: "Download image" }),
    );
    await waitFor(() => expect(downloads).toEqual(["A cat.jpg"]));
  });

  it("images false leaves out the button and drops a pasted image", async () => {
    const paste = (editor: Editor) =>
      fireEvent.paste(editor.view.dom, {
        clipboardData: {
          types: ["text/html"],
          files: [],
          getData: (type: string) =>
            type === "text/html" ? '<img src="https://example.com/a.png">' : "",
        },
      });

    const on = await mountInput();
    expect(screen.getByRole("button", { name: "Image" })).toBeTruthy();
    paste(on());
    expect(on().getHTML()).toContain("<img");
    cleanup();

    const off = await mountInput({ images: false });
    expect(screen.queryByRole("button", { name: "Image" })).toBeNull();
    paste(off());
    expect(off().getHTML()).not.toContain("<img");
  });

  it("a pasted image file is inserted like a chosen one", async () => {
    const editor = await mountInput();
    const file = png();
    fireEvent.paste(editor().view.dom, {
      clipboardData: { types: ["Files"], files: [file], getData: () => "" },
    });
    await waitFor(() =>
      expect(editor().getHTML()).toContain("data:image/png;base64,"),
    );
  });

  it("a stored hostile image renders no element for it", async () => {
    const hostile = [
      '<img src="javascript:alert(1)">',
      '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
      "<img src=x onerror=alert(1)>",
    ].join("");

    await mountInput({}, `<p>text</p>${hostile}`);
    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="rich-text-image"]'),
      ).not.toBeNull(),
    );
    const field = renderField(hostile);
    for (const root of [
      defined(document.querySelector('[data-slot="rich-text-input"]')),
      field,
    ]) {
      for (const img of root.querySelectorAll("img")) {
        const src = img.getAttribute("src") ?? "";
        expect(src).not.toMatch(/^javascript:/i);
        expect(src).not.toMatch(/^data:image\/svg/i);
      }
      for (const element of root.querySelectorAll("*")) {
        expect(
          element.getAttributeNames().filter((name) => name.startsWith("on")),
        ).toEqual([]);
      }
    }
    // The two unsafe sources leave nothing behind in the field either.
    expect(field.querySelectorAll("img")).toHaveLength(1);
  });
});

function renderField(body: string): HTMLElement {
  const record: LooseRecord = { id: 1, body };
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
  const { container } = render(<RichTextField source="body" />, { wrapper });
  return elementOf(
    defined(container.querySelector('[data-slot="rich-text-field"]')),
    HTMLElement,
  );
}
