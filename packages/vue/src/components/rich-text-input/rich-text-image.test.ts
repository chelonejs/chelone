import { closeHistory } from "@tiptap/pm/history";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountInput } from "./__fixtures__/rich-text-harness";

beforeEach(() => {
  let count = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:test/${++count}`,
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("rich text images", () => {
  it("inserts an image from an https URL", async () => {
    const { wrapper, form } = await mountInput();
    await wrapper.get('button[aria-label="Image"]').trigger("click");
    const panel = wrapper.get('[data-slot="rich-text-image-form"]');
    await panel
      .get('input[type="text"]')
      .setValue("https://example.com/cat.png");
    await panel.get("button").trigger("click");
    expect(wrapper.get("img").attributes("src")).toBe(
      "https://example.com/cat.png",
    );
    expect(form.values.value.body).toContain(
      'src="https://example.com/cat.png"',
    );
    expect(wrapper.find('[data-slot="rich-text-image-form"]').exists()).toBe(
      false,
    );
  });

  it("rejects a javascript or svg data URL in the image form", async () => {
    const { wrapper, form } = await mountInput();
    await wrapper.get('button[aria-label="Image"]').trigger("click");
    const panel = wrapper.get('[data-slot="rich-text-image-form"]');
    for (const src of [
      "javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
    ]) {
      await panel.get('input[type="text"]').setValue(src);
      await panel.get("button").trigger("click");
      expect(panel.get('[role="alert"]').text()).toBe(
        "Enter a link to an image",
      );
      expect(wrapper.find("img").exists()).toBe(false);
      expect(form.values.value.body).toBe("");
    }
  });

  it("uploads a file and stores the URL uploadFn returns", async () => {
    const handle = { resolve: (_value: { id: number; src: string }) => {} };
    const promise = new Promise<{ id: number; src: string }>((resolve) => {
      handle.resolve = resolve;
    });
    const upload = { promise, resolve: handle.resolve };
    const uploadFn = vi.fn(() => upload.promise);
    const { wrapper, form } = await mountInput({ images: { uploadFn } });
    await wrapper.get('button[aria-label="Image"]').trigger("click");
    const input = wrapper.get('input[type="file"]');
    const file = new File(["cat"], "cat.png", { type: "image/png" });
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    expect(uploadFn).toHaveBeenCalledWith(file);
    expect(wrapper.get("img").attributes("src")).toBe("blob:test/1");
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(form.values.value.body).not.toContain("<img");
    upload.resolve({ id: 7, src: "https://cdn.example.com/cat.png" });
    await vi.waitFor(() =>
      expect(wrapper.get("img").attributes("src")).toBe(
        "https://cdn.example.com/cat.png",
      ),
    );
    expect(form.values.value.body).toContain('data-id="7"');
    expect(form.values.value.body).toContain('data-file-name="cat.png"');
    expect(form.values.value.body).not.toContain("blob:");
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("shows the error state when uploadFn throws or returns an unsafe URL", async () => {
    const onImageError = vi.fn();
    const uploadFn = vi
      .fn<(file: File) => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("javascript:alert(1)");
    const { wrapper, form } = await mountInput({
      images: { uploadFn, onImageError },
    });
    await wrapper.get('button[aria-label="Image"]').trigger("click");
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, "files", {
      value: [
        new File(["a"], "a.png", { type: "image/png" }),
        new File(["b"], "b.png", { type: "image/png" }),
      ],
    });
    await input.trigger("change");
    await vi.waitFor(() =>
      expect(
        wrapper.findAll('[data-slot="rich-text-image-error"]'),
      ).toHaveLength(2),
    );
    expect(wrapper.findAll("img")).toHaveLength(0);
    expect(onImageError.mock.calls.map(([error]) => error.reason)).toEqual([
      "upload",
      "upload",
    ]);
    expect(form.values.value.body).toBe("");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/2");
  });

  it("the arrow keys on a handle resize within the limits", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const { wrapper, editor, form } = await mountInput(
      {},
      { body: '<p></p><img src="https://example.com/a.png" width="200">' },
    );
    expect(wrapper.find('[data-slot="rich-text-image-handle"]').exists()).toBe(
      false,
    );
    editor().commands.setNodeSelection(2);
    await vi.waitFor(() =>
      expect(
        wrapper.findAll('[data-slot="rich-text-image-handle"]'),
      ).toHaveLength(2),
    );
    const right = wrapper.get('[data-side="right"]');
    const left = wrapper.get('[data-side="left"]');
    await right.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.get("img").attributes("width")).toBe("210");
    await left.trigger("keydown", { key: "ArrowLeft" });
    expect(wrapper.get("img").attributes("width")).toBe("220");
    await right.trigger("keydown", { key: "ArrowLeft" });
    expect(wrapper.get("img").attributes("width")).toBe("210");
    for (let i = 0; i < 20; i++)
      await right.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.get("img").attributes("width")).toBe("300");
    for (let i = 0; i < 40; i++)
      await right.trigger("keydown", { key: "ArrowLeft" });
    expect(wrapper.get("img").attributes("width")).toBe("60");
    expect(form.values.value.body).toContain('width="60"');
  });

  it("view opens and Escape closes the overlay, and remove deletes the image", async () => {
    const { wrapper, form } = await mountInput(
      {},
      { body: '<img src="https://example.com/a.png" alt="A cat">' },
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await wrapper.get('button[aria-label="View image"]').trigger("click");
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/a.png",
    );
    expect(document.activeElement).toBe(dialog);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await vi.waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).toBeNull(),
    );
    await wrapper.get('button[aria-label="View image"]').trigger("click");
    document.querySelector<HTMLElement>('[role="dialog"]')?.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).toBeNull(),
    );
    await wrapper.get('button[aria-label="Remove image"]').trigger("click");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(form.values.value.body).toBe("");
  });

  it("a stored hostile image renders no element for it", async () => {
    const hostile = [
      '<img src="javascript:alert(1)">',
      '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
      "<img src=x onerror=alert(1)>",
    ].join("");
    const { wrapper } = await mountInput(
      {},
      { body: `<p>text</p>${hostile}`, fieldBody: hostile },
    );
    for (const slot of ["rich-text-input", "rich-text-field"]) {
      const root = wrapper.get(`[data-slot="${slot}"]`);
      expect(root.findAll("img").map((img) => img.attributes("src"))).toEqual([
        "x",
      ]);
      for (const element of root.element.querySelectorAll("*")) {
        expect(
          element.getAttributeNames().filter((name) => name.startsWith("on")),
        ).toEqual([]);
      }
    }
  });

  it("images false leaves out the button and drops a pasted image", async () => {
    const paste = (dom: HTMLElement) => {
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", {
        value: {
          types: ["text/html"],
          files: [],
          getData: (type: string) =>
            type === "text/html" ? '<img src="https://example.com/a.png">' : "",
        },
      });
      dom.dispatchEvent(event);
    };
    const on = await mountInput();
    expect(on.wrapper.find('button[aria-label="Image"]').exists()).toBe(true);
    paste(on.dom());
    expect(on.form.values.value.body).toContain("<img");
    const off = await mountInput({ images: false });
    expect(off.wrapper.find('button[aria-label="Image"]').exists()).toBe(false);
    paste(off.dom());
    expect(off.form.values.value.body).not.toContain("<img");
  });

  it("a pointer drag on a handle resizes the image", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const { wrapper, form } = await mountInput(
      {},
      { body: '<img src="https://example.com/a.png" width="200">' },
    );
    const right = wrapper.get('[data-side="right"]');
    right.element.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 100, bubbles: true }),
    );
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 140 }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 140 }));
    await vi.waitFor(() =>
      expect(wrapper.get("img").attributes("width")).toBe("240"),
    );
    expect(form.values.value.body).toContain('width="240"');
    wrapper
      .get('[data-side="left"]')
      .element.dispatchEvent(
        new PointerEvent("pointerdown", { clientX: 100, bubbles: true }),
      );
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 900 }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 900 }));
    await vi.waitFor(() =>
      expect(wrapper.get("img").attributes("width")).toBe("60"),
    );
  });

  it("turning images off after mount rebuilds the editor without image support", async () => {
    const { wrapper, setProps } = await mountInput({}, { body: "<p>kept</p>" });
    expect(wrapper.find('button[aria-label="Image"]').exists()).toBe(true);
    setProps({ images: false });
    await vi.waitFor(() =>
      expect(wrapper.find('button[aria-label="Image"]').exists()).toBe(false),
    );
    expect(wrapper.get('[role="textbox"]').text()).toBe("kept");
    setProps({ images: true });
    await vi.waitFor(() =>
      expect(wrapper.find('button[aria-label="Image"]').exists()).toBe(true),
    );
    expect(wrapper.get('[role="textbox"]').text()).toBe("kept");
  });

  it("undoing removal after an upload restores the stored URL", async () => {
    const handle = { resolve: (_value: string) => {} };
    const promise = new Promise<string>((resolve) => {
      handle.resolve = resolve;
    });
    const { wrapper, editor, form } = await mountInput({
      images: { uploadFn: () => promise },
    });
    await wrapper.get('button[aria-label="Image"]').trigger("click");
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, "files", {
      value: [new File(["cat"], "cat.png", { type: "image/png" })],
    });
    await input.trigger("change");
    editor().view.dispatch(closeHistory(editor().state.tr));
    await wrapper.get('button[aria-label="Remove image"]').trigger("click");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    handle.resolve("https://cdn.example.com/cat.png");
    await flushPromises();
    editor().commands.undo();
    await vi.waitFor(() =>
      expect(wrapper.get("img").attributes("src")).toBe(
        "https://cdn.example.com/cat.png",
      ),
    );
    expect(form.values.value.body).toContain(
      'src="https://cdn.example.com/cat.png"',
    );
    expect(form.values.value.body).not.toContain("blob:");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  it("stores a data URL without uploadFn and refuses files outside the rules", async () => {
    const onImageError = vi.fn();
    const { wrapper, form } = await mountInput({
      images: { maxFileSize: 10, onImageError },
    });
    await wrapper.get('button[aria-label="Image"]').trigger("click");
    const input = wrapper.get('input[type="file"]');
    const tooBig = new File([new Uint8Array(11)], "big.png", {
      type: "image/png",
    });
    const svg = new File(["<svg/>"], "bad.svg", { type: "image/svg+xml" });
    Object.defineProperty(input.element, "files", {
      value: [tooBig, svg, new File(["cat"], "cat.png", { type: "image/png" })],
    });
    await input.trigger("change");
    await vi.waitFor(() =>
      expect(form.values.value.body).toContain('src="data:image/png;base64,'),
    );
    expect(wrapper.findAll("img")).toHaveLength(1);
    expect(form.values.value.body).not.toContain("blob:");
    expect(
      onImageError.mock.calls.map(([error]) => [error.reason, error.file]),
    ).toEqual([
      ["size", tooBig],
      ["type", svg],
    ]);
  });
});
