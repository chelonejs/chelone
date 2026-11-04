import { describe, expect, it, vi } from "vitest";
import { createFormController } from "./form-controller";
import { createFormHandle } from "./form-handle";

interface Cart {
  title: string;
  tags: string[];
}

function makeHandle() {
  const save = vi.fn(async (_data: Cart): Promise<undefined> => undefined);
  const controller = createFormController<Cart>({
    defaultValues: { title: "hello", tags: ["a"] },
    save,
  });
  controller.subscribe(() => {});
  return { handle: createFormHandle(controller.form), save };
}

describe("createFormHandle().ambient", () => {
  it("binds a field through the erased form", () => {
    const { handle } = makeHandle();
    const binding = handle.ambient.bindField({ source: "title" });
    binding.subscribe(() => {});
    expect(binding.source).toBe("title");
    expect(handle.ambient.getFieldValue("title")).toBe("hello");
  });

  it("binds an array field through the erased form", () => {
    const { handle } = makeHandle();
    const binding = handle.ambient.bindArray({ source: "tags" });
    binding.subscribe(() => {});
    binding.add("b");
    expect(handle.ambient.getFieldValue("tags")).toEqual(["a", "b"]);
  });

  it("resets to the default values", () => {
    const { handle } = makeHandle();
    handle.ambient.setFieldValue("title", "changed");
    handle.ambient.reset();
    expect(handle.ambient.getFieldValue("title")).toBe("hello");
  });

  it("submits through the form's own save", async () => {
    const { handle, save } = makeHandle();
    await handle.ambient.handleSubmit();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("validates a field for a cause", async () => {
    const { handle } = makeHandle();
    await expect(
      handle.ambient.validateField("title", "submit"),
    ).resolves.toBeUndefined();
  });
});
