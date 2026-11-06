import type { BlockAttrs, BlockDocNode } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  doc,
  mountBlockEditor,
  paragraph,
  stubLayout,
} from "./__fixtures__/block-editor-harness";

beforeAll(stubLayout);
afterEach(() => cleanup());

const block = (
  type: string,
  attrs: BlockAttrs,
  ...content: BlockDocNode[]
): BlockDocNode => ({
  type,
  attrs,
  ...(content.length > 0 ? { content } : {}),
});

const stored = (...content: BlockDocNode[]) => ({
  defaultValues: { body: doc(...content) },
});

const showsOnly = (selector: string, src: string) =>
  [...document.querySelectorAll(selector)].filter(
    (element) => element.getAttribute("src") === src,
  );

describe("default blocks", () => {
  it("the editor offers callout, toggle, image and embed when no blocks are given", async () => {
    const { editor } = await mountBlockEditor();
    act(() => {
      editor().commands.focus();
      editor().commands.insertContent("/");
    });
    const list = await screen.findByRole("listbox");
    expect(
      within(list)
        .getAllByRole("option")
        .map((option) => option.textContent),
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
      stored(
        block("callout", { variant: "warning" }, paragraph("Mind the gap")),
      ),
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
      stored(block("callout", {}, paragraph("Plain"))),
    );
    expect(
      dom()
        .querySelector('[data-block="callout"] [data-variant]')
        ?.getAttribute("data-variant"),
    ).toBe("info");
  });

  it("a toggle opens and closes in the field and writes nothing", async () => {
    const onData = vi.fn();
    const body = doc(
      block("toggle", { summary: "More", open: false }, paragraph("Inside")),
      paragraph("After"),
    );
    const { submit } = await mountBlockEditor(
      { readOnly: true },
      { defaultValues: { body }, onData },
    );
    const summary = screen.getByRole("button", { name: "More" });
    const hidden = () => screen.getByText("Inside").closest("[hidden]");
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(hidden()).not.toBeNull();

    fireEvent.click(summary);
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(hidden()).toBeNull();

    fireEvent.click(summary);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(hidden()).not.toBeNull();

    fireEvent.click(summary);
    await submit();
    expect(onData).toHaveBeenCalledWith({ body });
  });

  it("a toggle shows its content in edit mode and its button writes nothing", async () => {
    const onData = vi.fn();
    const body = doc(
      block("toggle", { summary: "More", open: false }, paragraph("Inside")),
      paragraph("After"),
    );
    const { submit } = await mountBlockEditor(
      {},
      { defaultValues: { body }, onData },
    );
    expect(screen.getByText("Inside").closest("[hidden]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Inside").closest("[hidden]")).toBeNull();
    await submit();
    expect(onData).toHaveBeenCalledWith({ body });
  });

  it("an embed of a YouTube URL renders a sandboxed nocookie iframe", async () => {
    await mountBlockEditor(
      {},
      stored(block("embed", { url: "https://youtu.be/dQw4w9WgXcQ" })),
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
    await mountBlockEditor({}, stored(block("embed", { url: "" })));
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getByText(/YouTube/)).toBeTruthy();
    expect(screen.getByText(/Vimeo/)).toBeTruthy();
  });

  it("an image renders its source, alt text and width", async () => {
    await mountBlockEditor(
      {},
      stored(
        block("image", {
          src: "https://example.com/cat.png",
          alt: "A cat",
          widthPct: 40,
        }),
      ),
    );
    const img = screen.getByRole("img", { name: "A cat" });
    expect(img.getAttribute("src")).toBe("https://example.com/cat.png");
    expect(img.getAttribute("style")).toContain("40%");
  });

  it("an image without a source asks for an image", async () => {
    await mountBlockEditor({}, stored(block("image", { src: "" })));
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("Add an image")).toBeTruthy();
  });

  it("an image or embed with a hostile source renders no element for it", async () => {
    const hostile = [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "https://evil.example/x",
    ];
    for (const src of hostile) {
      await mountBlockEditor({}, stored(block("embed", { url: src })));
      expect(showsOnly("iframe", src)).toEqual([]);
      expect(document.querySelector("iframe")).toBeNull();
      cleanup();
    }
    // An https URL is a fine image, so only the two unsafe schemes are hostile there.
    for (const src of hostile.slice(0, 2)) {
      await mountBlockEditor({}, stored(block("image", { src })));
      expect(showsOnly("img", src)).toEqual([]);
      expect(document.querySelector("img")).toBeNull();
      cleanup();
    }
  });

  it("the toggle summary renders markup as text", async () => {
    const summary = "<img src=x onerror=alert(1)>";
    await mountBlockEditor(
      {},
      stored(block("toggle", { summary }, paragraph("Inside"))),
    );
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: summary })).toBeTruthy();
  });

  describe("the image config", () => {
    async function openImageConfig(onData = vi.fn()) {
      // The closing paragraph keeps the editor from adding its own.
      const body = doc(block("image", { src: "", alt: "" }), paragraph("End"));
      const mounted = await mountBlockEditor(
        {},
        { defaultValues: { body }, onData },
      );
      act(() => {
        mounted.editor().commands.setNodeSelection(0);
      });
      fireEvent.click(await screen.findByRole("button", { name: "Configure" }));
      return { ...mounted, body, onData };
    }

    it("an image file over 5 MB shows an error and writes nothing", async () => {
      const { submit, body, onData } = await openImageConfig();
      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      });
      fireEvent.change(screen.getByLabelText("Upload image"), {
        target: { files: [big] },
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "Choose an image file up to 5 MB",
      );
      await submit();
      expect(onData).toHaveBeenCalledWith({ body });
    });

    it("a file that is not an image shows an error and writes nothing", async () => {
      const { submit, body, onData } = await openImageConfig();
      const text = new File(["hello"], "notes.txt", { type: "text/plain" });
      fireEvent.change(screen.getByLabelText("Upload image"), {
        target: { files: [text] },
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "Choose an image file up to 5 MB",
      );
      await submit();
      expect(onData).toHaveBeenCalledWith({ body });
    });

    it("an image file within 5 MB is stored as a data URL", async () => {
      const { submit, onData } = await openImageConfig();
      const png = new File([new Uint8Array([137, 80, 78, 71])], "dot.png", {
        type: "image/png",
      });
      fireEvent.change(screen.getByLabelText("Upload image"), {
        target: { files: [png] },
      });
      await vi.waitFor(() =>
        expect(
          document.querySelector('[data-block="image"] img'),
        ).not.toBeNull(),
      );
      await submit();
      expect(onData.mock.calls[0]?.[0]?.body?.content?.[0]?.attrs?.src).toMatch(
        /^data:image\/png;base64,/,
      );
    });

    it("the URL, alt text and width write their own attribute", async () => {
      const { submit, onData } = await openImageConfig();
      fireEvent.change(screen.getByLabelText("Image URL"), {
        target: { value: "https://example.com/cat.png" },
      });
      fireEvent.change(screen.getByLabelText("Alt text"), {
        target: { value: "A cat" },
      });
      fireEvent.change(screen.getByLabelText("Width (%)"), {
        target: { value: "50" },
      });
      await submit();
      expect(onData.mock.calls[0]?.[0]?.body?.content?.[0]?.attrs).toEqual({
        src: "https://example.com/cat.png",
        alt: "A cat",
        widthPct: 50,
      });
    });
  });
});
