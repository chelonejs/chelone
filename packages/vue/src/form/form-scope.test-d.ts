import type { FieldErrors, UnboundFormHandle } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CheloneFormContextValue } from "./form-context";
import type { OptionalSaveFormProps } from "./form-scope";
import type { UseFormOptions } from "./use-form";

interface FormValues {
  title?: string;
  body?: string;
}

const okSave = async (): Promise<FieldErrors | undefined> => undefined;

type Props = OptionalSaveFormProps<FormValues>;

describe("OptionalSaveFormProps", () => {
  it("validate without save is a type error: the view owns the form", () => {
    const validate = () => undefined;
    // @ts-expect-error a form that drives its view's form takes no options
    const props: Props = { validate };
    expectTypeOf(props).toBeObject();
  });

  it("validate with save compiles", () => {
    const props: Props = { save: okSave, validate: () => undefined };
    expectTypeOf(props).toBeObject();
  });

  it("save is optional: a form inside a view needs none", () => {
    const props: Props = {};
    expectTypeOf(props).toBeObject();
  });

  it("onSubmit is not a prop: save takes its place", () => {
    // @ts-expect-error `save` replaces `onSubmit`
    const props: Props = { save: okSave, onSubmit: okSave };
    expectTypeOf(props).toBeObject();
  });

  it("the without-save member lists every UseFormOptions key but onSubmit", () => {
    type WithoutSave = Extract<Props, { save?: undefined }>;
    expectTypeOf<keyof WithoutSave>().toEqualTypeOf<
      | "save"
      | Exclude<keyof UseFormOptions<FormValues>, "onSubmit" | "recordForm">
    >();
  });

  it("the with-save member takes every UseFormOptions key but onSubmit", () => {
    type WithSave = Exclude<Props, { save?: undefined }>;
    expectTypeOf<keyof WithSave>().toEqualTypeOf<
      | "save"
      | Exclude<keyof UseFormOptions<FormValues>, "onSubmit" | "recordForm">
    >();
  });
});

describe("the form a plain useForm provides", () => {
  it("is the unbound handle: no resource, values unchecked", () => {
    // `useForm` provides a handle tagged by its resource when it has one. The
    // member with no resource holds whatever is registered.
    type Unbound = Extract<
      CheloneFormContextValue["form"],
      { resource: undefined }
    >;
    expectTypeOf<Unbound>().toEqualTypeOf<UnboundFormHandle>();
    expectTypeOf<Unbound["resource"]>().toBeUndefined();
    expectTypeOf<Unbound["ambient"]["getFieldValue"]>().returns.toBeUnknown();
  });

  it("with nothing registered, the context form is the unbound handle alone", () => {
    expectTypeOf<
      CheloneFormContextValue["form"]
    >().toEqualTypeOf<UnboundFormHandle>();
  });
});
