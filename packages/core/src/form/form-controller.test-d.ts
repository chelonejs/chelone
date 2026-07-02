import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  createFormController,
  type FieldErrors,
  type FormController,
  type FormControllerOptions,
  normalizeFormError,
  type TranslatableMessage,
} from "./form-controller";

interface PostDraft {
  title: string;
  views: number;
}

it("is generic in the data type only — no `any` leaks on the public surface", () => {
  const controller = createFormController<PostDraft>({
    defaultValues: { title: "a", views: 1 },
    save: async () => undefined,
  });
  expectTypeOf(controller).not.toBeAny();
  expectTypeOf(controller.form).not.toBeAny();
  expectTypeOf(controller.getSnapshot()).not.toBeAny();
  expectTypeOf(controller.getSnapshot().values).toEqualTypeOf<PostDraft>();
  expectTypeOf(controller.form.state.values).toEqualTypeOf<PostDraft>();
  expectTypeOf(controller.subscribe).parameter(0).toEqualTypeOf<() => void>();
  expectTypeOf(controller.subscribe).returns.toEqualTypeOf<() => void>();
  expectTypeOf(controller.destroy).returns.toBeVoid();
});

it("save follows the P4 contract (resolves FieldErrors | undefined)", () => {
  expectTypeOf<FormControllerOptions<PostDraft>["save"]>().toEqualTypeOf<
    (data: PostDraft) => Promise<FieldErrors | undefined>
  >();
  expectTypeOf<FieldErrors>().toEqualTypeOf<
    Record<string, string | string[]>
  >();
});

it("accepts a zod resource schema as the StandardSchemaV1 slot", () => {
  const schema = z.object({ title: z.string(), views: z.number() });
  const options: FormControllerOptions<PostDraft> = {
    schema,
    save: async () => undefined,
  };
  expectTypeOf(options.schema).not.toBeAny();
});

it("form.setFieldValue is typed by the record's DeepKeys", () => {
  const controller: FormController<PostDraft> = createFormController({
    save: async (data) => {
      expectTypeOf(data).toEqualTypeOf<PostDraft>();
      return undefined;
    },
  });
  expectTypeOf(controller.form.setFieldValue<"title">)
    .parameter(0)
    .toEqualTypeOf<"title">();
  // @ts-expect-error -- "nope" is not a key of PostDraft
  controller.form.setFieldValue("nope", 1);
});

it("normalizeFormError returns the translatable boundary union", () => {
  expectTypeOf(normalizeFormError(null)).toEqualTypeOf<
    string | TranslatableMessage | undefined
  >();
  expectTypeOf<TranslatableMessage>().toEqualTypeOf<{
    message: string;
    args?: Record<string, unknown>;
  }>();
});
