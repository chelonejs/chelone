import { expectTypeOf, it } from "vitest";
import { type CheloneFormApi, createFormController } from "./form-controller";
import {
  type CheloneFieldStore,
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
  expectTypeOf(binding.getValue()).toEqualTypeOf<string>();
  expectTypeOf(binding.setValue).parameter(0).toEqualTypeOf<string>();
  expectTypeOf(binding.store.state.meta).not.toBeAny();
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
  expectTypeOf(defaultFormat<string | null>(null)).toEqualTypeOf<string>();
  expectTypeOf(defaultFormat(null)).toEqualTypeOf<"">();
  expectTypeOf(defaultFormat<number | undefined>(0)).toEqualTypeOf<
    number | ""
  >();
  expectTypeOf(defaultParse<string | null>("")).toEqualTypeOf<string | null>();
});

const typed = () =>
  createFormController<Draft>({
    defaultValues: { title: "a", views: 1, tags: [] },
    save: async () => undefined,
  });

declare const looseForm: CheloneFormApi<Record<string, unknown>>;

it("createFieldBinding accepts a path of its form's record", () => {
  const controller = typed();
  createFieldBinding(controller.form, { source: "title" });
  createFieldBinding(controller.form, { source: "views" });
});

it("createFieldBinding accepts a bracket path", () => {
  const controller = typed();
  createFieldBinding(controller.form, { source: "tags[0].label" });
});

it("createFieldBinding rejects a source that is not a path of the record", () => {
  const controller = typed();
  // @ts-expect-error "nope" is not a path of Draft
  createFieldBinding(controller.form, { source: "nope" });
});

it("createFieldBinding takes any string for a Record<string, unknown> form", () => {
  const composed: string = "anything[3].goes";
  createFieldBinding(looseForm, { source: composed });
});

it("format is told about the holes a record's type does not show", () => {
  const { form } = typed();
  createFieldBinding(form, {
    source: "title",
    // @ts-expect-error a cleared or untouched field reaches format as a hole
    format: (value: string) => value.toUpperCase(),
    parse: (input: string) => input,
  });
});

it("a binding's options are typed by the value at its source", () => {
  const { form } = typed();
  createFieldBinding(form, {
    source: "views",
    defaultValue: 3,
    format: (value) => {
      expectTypeOf(value).toEqualTypeOf<number | null | undefined>();
      return String(value);
    },
    parse: (input) => {
      expectTypeOf(input).toEqualTypeOf<string>();
      return Number(input);
    },
  });
});

it("createFieldBinding rejects a default or a parse of the wrong value", () => {
  const { form } = typed();
  // @ts-expect-error `views` holds a number
  createFieldBinding(form, { source: "views", defaultValue: "three" });
  createFieldBinding(form, {
    source: "views",
    format: String,
    // @ts-expect-error `views` stores a number
    parse: (input: string) => input,
  });
});

it("update takes the binding's own option types", () => {
  const { form } = typed();
  const binding = createFieldBinding(form, {
    source: "views",
    format: String,
    parse: Number,
  });
  binding.update({ format: String, parse: Number, defaultValue: 3 });
  // @ts-expect-error `views` holds a number
  binding.update({ defaultValue: "three" });
  // @ts-expect-error this binding's input is a string
  binding.update({ format: (value: number) => value });
});

it("a binding's store reads the field of its own record", () => {
  const { form } = typed();
  const binding = createFieldBinding(form, { source: "title" });
  expectTypeOf(binding.store).toEqualTypeOf<CheloneFieldStore<Draft>>();
  expectTypeOf(binding.store.state.value).not.toBeUnknown();
  expectTypeOf(binding.store.state.value).not.toBeAny();
});
