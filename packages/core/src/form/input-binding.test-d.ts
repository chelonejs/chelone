import { expectTypeOf, it } from "vitest";
import { createFormController } from "./form-controller";
import {
  createFieldBinding,
  defaultFormat,
  defaultParse,
} from "./input-binding";
import {
  composeValidators,
  isRequired,
  minLength,
  required,
  type Validator,
} from "./validators";

interface Draft {
  title: string;
  views: number;
}

it("the field binding surface carries no `any`", () => {
  const controller = createFormController<Draft>({
    defaultValues: { title: "a", views: 1 },
    save: async () => undefined,
  });
  const binding = createFieldBinding(controller.form, { source: "title" });
  expectTypeOf(binding).not.toBeAny();
  expectTypeOf(binding.field).not.toBeAny();
  expectTypeOf(binding.getSnapshot()).not.toBeAny();
  expectTypeOf(binding.getSnapshot().meta.isTouched).toEqualTypeOf<boolean>();
  expectTypeOf(binding.getSnapshot().meta.errors).not.toBeAny();
  expectTypeOf(binding.getValue()).toEqualTypeOf<unknown>();
  expectTypeOf(binding.setValue).parameter(0).toEqualTypeOf<unknown>();
  expectTypeOf(binding.subscribe).parameter(0).toEqualTypeOf<() => void>();
  expectTypeOf(binding.subscribe).returns.toEqualTypeOf<() => void>();
  expectTypeOf(binding.isRequired()).toEqualTypeOf<boolean>();
  expectTypeOf(binding.destroy).returns.toBeVoid();
});

it("validators keep the ra contract types (translatable payloads, no any)", () => {
  expectTypeOf(required().isRequired).toEqualTypeOf<true>();
  expectTypeOf(
    composeValidators(required(), minLength(3)),
  ).toEqualTypeOf<Validator>();
  expectTypeOf(isRequired([required(), minLength(3)])).toEqualTypeOf<boolean>();
  expectTypeOf(minLength(3)).not.toBeAny();
  expectTypeOf(defaultFormat(null)).toEqualTypeOf<unknown>();
  expectTypeOf(defaultParse("")).toEqualTypeOf<unknown>();
});
