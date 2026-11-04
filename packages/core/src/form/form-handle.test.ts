import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createFormController } from "./form-controller";
import { createFormHandle, toFormContextHandle } from "./form-handle";

interface Post {
  title: string;
  tags: string[];
}

const makeForm = (save = vi.fn(async () => undefined)) => {
  const controller = createFormController<Post>({
    defaultValues: { title: "a", tags: ["x"] },
    save,
  });
  return { controller, save, handle: createFormHandle(controller.form) };
};

describe("AmbientForm", () => {
  it("bindField binds one field of the form", () => {
    const { handle } = makeForm();
    const binding = handle.ambient.bindField({ source: "title" });
    const off = binding.subscribe(() => undefined);

    expect(binding.source).toBe("title");
    expect(binding.getValue()).toBe("a");
    binding.setValue("b");
    expect(handle.getFieldValue("title")).toBe("b");
    off();
  });

  it("bindArray binds one array field of the form", () => {
    const { handle } = makeForm();
    const binding = handle.ambient.bindArray({ source: "tags" });
    const off = binding.subscribe(() => undefined);

    expect(binding.getTotal()).toBe(1);
    binding.add("y");
    expect(handle.getFieldValue("tags")).toEqual(["x", "y"]);
    off();
  });

  it("validateField settles once the field's validators have run", async () => {
    const controller = createFormController<Post>({
      defaultValues: { title: "", tags: [] },
      schema: z.object({ title: z.string().min(1), tags: z.array(z.string()) }),
      save: async () => undefined,
    });
    const { ambient } = createFormHandle(controller.form);
    const binding = ambient.bindField({ source: "title" });
    const off = binding.subscribe(() => undefined);

    await ambient.validateField("title", "submit");

    expect(ambient.getFieldMeta("title")?.isValid).toBe(false);
    off();
  });

  it("handleSubmit runs the save the form was built with", async () => {
    const { handle, save } = makeForm();

    await handle.ambient.handleSubmit();

    expect(save).toHaveBeenCalledWith({ title: "a", tags: ["x"] });
  });

  it("reset rebaselines the form from the values it is given", () => {
    const { handle } = makeForm();
    handle.ambient.setFieldValue("title", "edited");
    expect(handle.ambient.store.state.isDirty).toBe(true);

    handle.ambient.reset({ title: "fresh", tags: [] });

    expect(handle.getFieldValue("title")).toBe("fresh");
    expect(handle.ambient.store.state.isDirty).toBe(false);
  });
});

describe("toFormContextHandle", () => {
  it("tags the handle with the resource", () => {
    const { handle } = makeForm();
    expect(toFormContextHandle(handle, "posts").resource).toBe("posts");
  });

  it("leaves the handle unbound without a resource", () => {
    const { handle } = makeForm();
    expect(toFormContextHandle(handle, undefined).resource).toBeUndefined();
  });
});
