import type {
  CheloneFormApi,
  FieldErrors,
  FormContextHandle,
  FormContextHandleOf,
  ResourceFormHandle,
  SourceValue,
  TranslatableMessage,
  UnboundFormHandle,
} from "@chelone/core";
import { defineResources } from "@chelone/core";
import type { FocusEvent } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  FormStateSlices,
  NamedFormHandle,
  UseCreateFormResult,
  UseEditFormResult,
  UseFormControllerResult,
  UseFormResult,
  UseInputResult,
} from "./form-hooks";
import { useFormHandle, useInput } from "./form-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Post = { id: number; title: string };
type Article = { headline: string; views: number; author: { name: string } };

describe("form hook result types (P4 lesson: type symmetry)", () => {
  it("UseFormResult is generic in the form data type, never any", () => {
    type Result = UseFormResult<{ title: string }>;
    expectTypeOf<Result["form"]>().toEqualTypeOf<
      CheloneFormApi<{ title: string }>
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
      CheloneFormApi<Partial<Post>>
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
      CheloneFormApi<Partial<Post>>
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

describe("useInput source typing", () => {
  it("useInput<Post> accepts a path of Post", () => {
    expectTypeOf(useInput<Post>).toBeCallableWith({ source: "title" });
  });

  it("useInput<Post> rejects a source that is not a path of Post", () => {
    // @ts-expect-error "titel" is not a path of Post
    expectTypeOf(useInput<Post>).toBeCallableWith({ source: "titel" });
  });

  it("useInput without a type argument takes any string", () => {
    expectTypeOf(useInput).toBeCallableWith({ source: "anything.at[0].all" });
  });
});

describe("useInput value typing", () => {
  it("useInput types format with the value at its source", () => {
    useInput<Article, "views">({
      source: "views",
      format: (value) => {
        expectTypeOf(value).toEqualTypeOf<number | null | undefined>();
        return String(value);
      },
    });
  });

  it("useInput types parse to return the value at its source", () => {
    useInput<Article, "views">({
      source: "views",
      defaultValue: 0,
      parse: (input) => Number(input),
    });
    useInput<Article, "views">({
      source: "views",
      // @ts-expect-error parse must return a number for "views"
      parse: (input) => String(input),
    });
  });

  it("useInput rejects a format that takes the wrong value type", () => {
    useInput<Article, "headline">({
      source: "headline",
      // @ts-expect-error "headline" is a string, not a number
      format: (value: number) => value,
    });
  });

  it("useInput without a record takes unknown values", () => {
    useInput({
      source: "anything",
      defaultValue: 1,
      format: (value) => {
        expectTypeOf(value).toBeUnknown();
        return value;
      },
      parse: (input) => input,
    });
  });
});

describe("useInput result typing", () => {
  it("field.onBlur takes an optional focus event", () => {
    expectTypeOf<
      Parameters<UseInputResult["field"]["onBlur"]>[0]
    >().toEqualTypeOf<FocusEvent | undefined>();
  });

  it("field.value is the input type", () => {
    expectTypeOf<UseInputResult<string>["field"]["value"]>().toBeString();
  });
});

/** An explicit resource map: nothing is registered in this program. */
type Resources = { posts: Post; tags: { label: string } };
type Handles = FormContextHandleOf<Resources>;
declare const handle: NamedFormHandle<Handles, "posts">;
declare const context: Handles;

describe("useFormHandle", () => {
  it("useFormHandle() is the context union", () => {
    expectTypeOf(useFormHandle()).toEqualTypeOf<FormContextHandle>();
    // Nothing is registered here, so the union is the unbound member alone.
    expectTypeOf(useFormHandle()).toEqualTypeOf<UnboundFormHandle>();
  });

  it("useFormHandle(name) takes a registered resource only", () => {
    // @ts-expect-error nothing is registered, so no name is a resource
    useFormHandle("posts");
  });

  it("useFormHandle(name) is that resource's handle or undefined", () => {
    // `useFormHandle(name)` returns `NamedFormHandle<FormContextHandle, name>`;
    // a global `Register` would leak into every file of this program, so the
    // union is spelled with an explicit resource map.
    type Posts = NamedFormHandle<Handles, "posts">;
    expectTypeOf<Posts>().toEqualTypeOf<
      ResourceFormHandle<"posts", Partial<Post>> | undefined
    >();
    if (handle) {
      expectTypeOf(handle.getFieldValue("title")).toEqualTypeOf<
        SourceValue<Partial<Post>, "title">
      >();
      expectTypeOf(handle.getFieldValue("title")).not.toBeUnknown();
      // @ts-expect-error "titel" is not a path of Post
      handle.getFieldValue("titel");
    }
  });

  it("the context union narrows on .resource", () => {
    if (context.resource === "posts") {
      expectTypeOf(context).toEqualTypeOf<
        ResourceFormHandle<"posts", Partial<Post>>
      >();
    } else if (context.resource === undefined) {
      expectTypeOf(context).toEqualTypeOf<UnboundFormHandle>();
    }
  });
});
