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
});
