import { describe, expect, it } from "vitest";
import { createFormController } from "./form-controller";
import { setFormValues } from "./set-form-values";

interface PostDraft {
  title: string;
  views: number;
}

describe("setFormValues", () => {
  it("writes every key of the data into the form", () => {
    const { form } = createFormController<PostDraft>({
      defaultValues: { title: "a", views: 1 },
      save: async () => undefined,
    });
    setFormValues(form, { title: "b", views: 2 });
    expect(form.state.values).toEqual({ title: "b", views: 2 });
  });

  it("leaves a key the data omits as it was", () => {
    const { form } = createFormController<PostDraft>({
      defaultValues: { title: "a", views: 1 },
      save: async () => undefined,
    });
    setFormValues(form, { views: 5 });
    expect(form.state.values).toEqual({ title: "a", views: 5 });
  });
});
