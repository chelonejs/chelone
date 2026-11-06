import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../create-resource-components";
import { type UseArrayInputResult, useArrayInput } from "./use-array-input";

type Post = { number: string; lines: { sku: string }[] };

describe("useArrayInput source typing", () => {
  it("useArrayInput<Post> accepts a path of Post", () => {
    const input = useArrayInput<Post>;
    expectTypeOf(input).toBeCallableWith({ source: "lines" });
  });

  it("useArrayInput<Post> rejects a source that is not a path of Post", () => {
    const input = useArrayInput<Post>;
    // @ts-expect-error "line" is not a path of Post
    expectTypeOf(input).toBeCallableWith({ source: "line" });
  });

  it("useArrayInput without a type argument takes any string", () => {
    const input = useArrayInput;
    expectTypeOf(input).toBeCallableWith({ source: "whatever" });
  });
});

const resources = defineResources({
  carts: {
    schema: z.object({
      items: z.array(z.object({ sku: z.string(), qty: z.number() })),
      tags: z.array(z.string()),
      id: z.number(),
      status: z.enum(["open", "paid"]),
    }),
  },
  settings: {
    schema: z.object({ name: z.string(), labels: z.array(z.string()) }),
  },
  drafts: {
    schema: z.object({
      labels: z.array(z.number()),
      id: z.string().optional(),
    }),
  },
});

type Cart = RecordOf<typeof resources, "carts">;

const carts = createResourceComponentsOf<typeof resources, "carts">("carts");

type CartItem = Cart["items"][number];

describe("carts.ArrayInput", () => {
  it("types defaultValue and itemDefaults by the array at source", () => {
    const items = carts.ArrayInput<"items">;
    const tags = carts.ArrayInput<"tags">;
    type ItemProps = Parameters<typeof items>[0];
    type TagProps = Parameters<typeof tags>[0];
    expectTypeOf<NonNullable<ItemProps["defaultValue"]>>().toEqualTypeOf<
      readonly CartItem[]
    >();
    expectTypeOf<NonNullable<ItemProps["itemDefaults"]>>().toEqualTypeOf<
      Partial<CartItem>
    >();
    expectTypeOf<NonNullable<TagProps["defaultValue"]>>().toEqualTypeOf<
      readonly string[]
    >();
  });

  it("accepts a source of a cart with rows and defaults to match", () => {
    carts.ArrayInput({
      source: "items",
      defaultValue: [{ sku: "a", qty: 1 }],
      itemDefaults: { qty: 1 },
    });
  });

  it("rejects a misspelled source", () => {
    // @ts-expect-error `itemz` is no path of a cart
    carts.ArrayInput({ source: "itemz" });
  });

  it("rejects rows and defaults that are not those of a cart item", () => {
    carts.ArrayInput({
      source: "items",
      // @ts-expect-error a row needs a numeric qty
      defaultValue: [{ sku: "a", qty: "1" }],
    });
    // @ts-expect-error `price` is no key of a cart item
    carts.ArrayInput({ source: "items", itemDefaults: { price: 1 } });
  });
});

describe("ArrayInput of a record with no required id", () => {
  it("is still a member, with rows typed by its array", () => {
    const settings = createResourceComponentsOf<typeof resources, "settings">(
      "settings",
    );
    const drafts = createResourceComponentsOf<typeof resources, "drafts">(
      "drafts",
    );
    settings.ArrayInput({ source: "labels", defaultValue: ["a"] });
    drafts.ArrayInput({ source: "labels", defaultValue: [1] });
    // @ts-expect-error `labelz` is no path of a setting
    settings.ArrayInput({ source: "labelz" });
  });
});

describe("useArrayInput rows", () => {
  it("types add, insert and replace by the row of the array at source", () => {
    const items = useArrayInput<Cart, "items">;
    type Result = ReturnType<typeof items>;
    expectTypeOf<Result>().toEqualTypeOf<UseArrayInputResult<CartItem>>();
    expectTypeOf<Parameters<Result["add"]>[0]>().toEqualTypeOf<
      CartItem | undefined
    >();
    expectTypeOf<Parameters<Result["replace"]>[1]>().toEqualTypeOf<CartItem>();
  });

  it("rejects a row that is not a cart item", () => {
    const { add, insert, replace } = useArrayInput<Cart, "tags">({
      source: "tags",
    });
    add("a");
    // @ts-expect-error a tag is a string, not a number
    insert(0, 1);
    // @ts-expect-error a tag is a string, not a cart item
    replace(0, { sku: "a", qty: 1 });
  });

  it("keeps the untyped row for a source that is a plain string", () => {
    const source: string = "anything[0].at";
    const input = useArrayInput({ source });
    expectTypeOf(input).toEqualTypeOf<UseArrayInputResult>();
    input.insert(0, 5);
  });
});
