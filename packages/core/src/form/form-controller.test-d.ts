import type { FormValidateOrFn } from "@tanstack/form-core";
import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  createFormController,
  type FieldErrors,
  type FormController,
  type FormControllerOptions,
} from "./form-controller";
import type { FormErrorMapValue } from "./form-errors";
import {
  type ComposeFormValidatorConfig,
  composeFormValidator,
} from "./save-pipeline";

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

it("submit never rejects and takes no arguments", () => {
  const controller = createFormController<PostDraft>({
    save: async () => undefined,
  });
  expectTypeOf(controller.submit).toEqualTypeOf<() => Promise<void>>();
});

it("the T2 pipeline options are precisely typed (no any)", () => {
  expectTypeOf<FormControllerOptions<PostDraft>["getRecord"]>().toEqualTypeOf<
    (() => Partial<PostDraft> | undefined) | undefined
  >();
  expectTypeOf<FormControllerOptions<PostDraft>["onSuccess"]>().toEqualTypeOf<
    ((data: PostDraft) => void | Promise<void>) | undefined
  >();
  expectTypeOf<
    FormControllerOptions<PostDraft>["notifications"]
  >().not.toBeAny();
});

interface Comment {
  body: string;
}

it("composeFormValidator keeps the user's form-core validator type", () => {
  expectTypeOf<
    ComposeFormValidatorConfig<PostDraft>["userValidator"]
  >().toEqualTypeOf<FormValidateOrFn<PostDraft> | undefined>();

  const forPost: FormValidateOrFn<PostDraft> = ({ value }) =>
    value.title ? undefined : "title required";
  const forComment: FormValidateOrFn<Comment> = ({ value }) =>
    value.body ? undefined : "body required";

  composeFormValidator<PostDraft>({ userValidator: forPost });
  composeFormValidator<PostDraft>({
    // @ts-expect-error -- a validator for Comment does not validate a PostDraft
    userValidator: forComment,
  });
});

it("composeFormValidator returns a validator of form-core's props and the error-map value", () => {
  const composed = composeFormValidator<PostDraft>({
    validate: () => undefined,
  });
  expectTypeOf(composed).not.toBeAny();
  expectTypeOf<NonNullable<typeof composed>>().returns.toEqualTypeOf<
    FormErrorMapValue | undefined
  >();
});
