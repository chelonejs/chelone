import type {
  ChelonFormApi,
  FieldErrors,
  TranslatableMessage,
} from "@chelone/core";
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  FormStateSlices,
  UseCreateFormResult,
  UseEditFormResult,
  UseFormControllerResult,
  UseFormResult,
  UseInputResult,
} from "./form-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Post = { id: number; title: string };

describe("form hook result types (P4 lesson: type symmetry)", () => {
  it("UseFormResult is generic in the form data type, never any", () => {
    type Result = UseFormResult<{ title: string }>;
    expectTypeOf<Result["form"]>().toEqualTypeOf<
      ChelonFormApi<{ title: string }>
    >();
    expectTypeOf<Result["form"]["state"]["values"]>().toEqualTypeOf<{
      title: string;
    }>();
    expectTypeOf<Result["submit"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<Result["canSubmit"]>().toBeBoolean();
    expectTypeOf<Result["isDefaultValue"]>().toBeBoolean();
    expectTypeOf<Result>().not.toBeAny();
    // UseFormControllerResult and UseFormResult are the same surface.
    expectTypeOf<UseFormControllerResult<{ title: string }>>().toEqualTypeOf<
      UseFormResult<{ title: string }>
    >();
  });

  it("UseEditFormResult carries the registry record type and form slices", () => {
    type Result = UseEditFormResult<Post>;
    expectTypeOf<Result["record"]>().toEqualTypeOf<Post | undefined>();
    expectTypeOf<Result["form"]>().toEqualTypeOf<
      ChelonFormApi<Partial<Post>>
    >();
    expectTypeOf<Result["saving"]>().toBeBoolean();
    expectTypeOf<Result["isPending"]>().toBeBoolean();
    expectTypeOf<Result>().toMatchTypeOf<FormStateSlices>();
    expectTypeOf<Result>().not.toBeAny();
    expectTypeOf<Result["record"]>().not.toBeAny();
  });

  it("UseCreateFormResult exposes the seed record and slices", () => {
    type Result = UseCreateFormResult<Post>;
    expectTypeOf<Result["record"]>().toEqualTypeOf<Partial<Post>>();
    expectTypeOf<Result["form"]>().toEqualTypeOf<
      ChelonFormApi<Partial<Post>>
    >();
    expectTypeOf<Result>().toMatchTypeOf<FormStateSlices>();
    expectTypeOf<Result>().not.toBeAny();
  });

  it("UseInputResult is the ra-parity shape with normalized errors", () => {
    expectTypeOf<UseInputResult["id"]>().toBeString();
    expectTypeOf<UseInputResult["field"]["name"]>().toBeString();
    expectTypeOf<UseInputResult["field"]["value"]>().toEqualTypeOf<unknown>();
    expectTypeOf<UseInputResult["field"]["onChange"]>().toEqualTypeOf<
      (eventOrValue?: unknown) => void
    >();
    expectTypeOf<UseInputResult["fieldState"]["invalid"]>().toBeBoolean();
    expectTypeOf<UseInputResult["fieldState"]["error"]>().toEqualTypeOf<
      string | TranslatableMessage | undefined
    >();
    expectTypeOf<UseInputResult["isRequired"]>().toBeBoolean();
    expectTypeOf<UseInputResult>().not.toBeAny();
  });

  it("registry inference flows: RecordOf posts is the zod-inferred shape", () => {
    type FromRegistry = UseEditFormResult<
      z.infer<(typeof resources)["posts"]["schema"]>
    >;
    expectTypeOf<FromRegistry["record"]>().toEqualTypeOf<Post | undefined>();
  });

  it("FieldErrors flat-path contract is preserved", () => {
    expectTypeOf<FieldErrors>().toEqualTypeOf<
      Record<string, string | string[]>
    >();
  });
});
