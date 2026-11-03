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
  tags: { label: string }[];
}

it("the field binding surface carries no `any`", () => {
  const controller = createFormController<Draft>({
    defaultValues: { title: "a", views: 1, tags: [] },
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

it("createFieldBinding accepts a path of its form's record", () => {
  const controller = createFormController<Draft>({
    defaultValues: { title: "a", views: 1, tags: [] },
    save: async () => undefined,
  });
  createFieldBinding(controller.form, { source: "title" });
  createFieldBinding(controller.form, { source: "views" });
});

it("createFieldBinding accepts a bracket path", () => {
  const controller = createFormController<Draft>({
    defaultValues: { title: "a", views: 1, tags: [] },
    save: async () => undefined,
  });
  createFieldBinding(controller.form, { source: "tags[0].label" });
});

it("createFieldBinding rejects a source that is not a path of the record", () => {
  const controller = createFormController<Draft>({
    defaultValues: { title: "a", views: 1, tags: [] },
    save: async () => undefined,
  });
  // @ts-expect-error "nope" is not a path of Draft
  createFieldBinding(controller.form, { source: "nope" });
});

it("createFieldBinding takes any string for a Record<string, unknown> form", () => {
  const controller = createFormController<Record<string, unknown>>({
    defaultValues: {},
    save: async () => undefined,
  });
  const composed: string = "anything[3].goes";
  createFieldBinding(controller.form, { source: composed });
});
