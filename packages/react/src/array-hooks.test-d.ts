import { type ArrayRow, defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { IteratorItem, UseArrayInputResult } from "./array-hooks";
import { useArrayInput } from "./array-hooks";
import { createResourceComponentsOf } from "./resource/create-resource-components";

type Post = { id: number; tags: { label: string }[] };

describe("array hook result types", () => {
  it("UseArrayInputResult exposes the ra iterator surface, never any", () => {
    expectTypeOf<UseArrayInputResult["source"]>().toBeString();
    expectTypeOf<UseArrayInputResult["total"]>().toBeNumber();
    expectTypeOf<UseArrayInputResult["rows"]>().toEqualTypeOf<
      readonly ArrayRow[]
    >();
    expectTypeOf<UseArrayInputResult["add"]>().toEqualTypeOf<
      (item?: unknown) => void
    >();
    expectTypeOf<UseArrayInputResult["reOrder"]>().toEqualTypeOf<
      (from: number, to: number) => void
    >();
    expectTypeOf<UseArrayInputResult["fieldState"]["invalid"]>().toBeBoolean();
    expectTypeOf<UseArrayInputResult>().not.toBeAny();
  });

  it("IteratorItem is the per-row shape", () => {
    expectTypeOf<IteratorItem["index"]>().toBeNumber();
    expectTypeOf<IteratorItem["total"]>().toBeNumber();
    expectTypeOf<IteratorItem["remove"]>().toEqualTypeOf<() => void>();
    expectTypeOf<IteratorItem["reOrder"]>().toEqualTypeOf<
      (newIndex: number) => void
    >();
    expectTypeOf<IteratorItem>().not.toBeAny();
  });
});

describe("useArrayInput source typing", () => {
  it("useArrayInput<Post> accepts a path of Post", () => {
    expectTypeOf(useArrayInput<Post>).toBeCallableWith({ source: "tags" });
  });

  it("useArrayInput<Post> rejects a source that is not a path of Post", () => {
    // @ts-expect-error "tagz" is not a path of Post
    expectTypeOf(useArrayInput<Post>).toBeCallableWith({ source: "tagz" });
  });

  it("useArrayInput without a type argument takes any string", () => {
    expectTypeOf(useArrayInput).toBeCallableWith({ source: "anything[0].at" });
  });
});

const resources = defineResources({
  carts: {
    schema: z.object({
      id: z.number(),
      note: z.string(),
      items: z.array(z.object({ sku: z.string(), qty: z.number() })),
      tags: z.array(z.string()),
    }),
  },
  settings: {
    schema: z.object({ key: z.string(), tags: z.array(z.string()) }),
  },
  drafts: {
    schema: z.object({
      id: z.number().optional(),
      tags: z.array(z.string()),
    }),
  },
});

type Cart = RecordOf<typeof resources, "carts">;

const carts = createResourceComponentsOf<typeof resources, "carts">("carts");

describe("carts.ArrayInput", () => {
  it("takes defaultValue rows typed as a Cart item", () => {
    const input = carts.ArrayInput<"items">;
    type Props = Parameters<typeof input>[0];
    expectTypeOf<Props["defaultValue"]>().toEqualTypeOf<
      readonly Cart["items"][number][] | undefined
    >();
    expectTypeOf<Props["itemDefaults"]>().toEqualTypeOf<
      Partial<Cart["items"][number]> | undefined
    >();
    const tags = carts.ArrayInput<"tags">;
    expectTypeOf<Parameters<typeof tags>[0]["defaultValue"]>().toEqualTypeOf<
      readonly string[] | undefined
    >();
  });

  it("accepts rows of the array it binds, and partial item defaults", () => {
    carts.ArrayInput({
      source: "items",
      defaultValue: [{ sku: "a", qty: 1 }],
      itemDefaults: { qty: 1 },
      children: null,
    });
  });

  it("rejects a source that is not a path of a cart", () => {
    carts.ArrayInput({
      // @ts-expect-error `itemz` is no path of a cart
      source: "itemz",
      children: null,
    });
  });

  it("rejects a row that is not a cart item", () => {
    carts.ArrayInput({
      source: "items",
      // @ts-expect-error a row needs a numeric qty
      defaultValue: [{ sku: "a", qty: "one" }],
      children: null,
    });
    carts.ArrayInput({
      source: "items",
      // @ts-expect-error `price` is no key of a cart item
      itemDefaults: { price: 1 },
      children: null,
    });
  });
});

describe("ArrayInput of a record with no required id", () => {
  it("keeps the member and types its rows", () => {
    const settings = createResourceComponentsOf<typeof resources, "settings">(
      "settings",
    );
    const drafts = createResourceComponentsOf<typeof resources, "drafts">(
      "drafts",
    );
    settings.ArrayInput({
      source: "tags",
      defaultValue: ["a"],
      children: null,
    });
    drafts.ArrayInput({ source: "tags", defaultValue: ["a"], children: null });
    settings.ArrayInput({
      // @ts-expect-error `tagz` is no path of a setting
      source: "tagz",
      children: null,
    });
  });
});
