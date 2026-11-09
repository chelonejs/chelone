/**
 * The products demo's typed components, checked by `tsc` (`pnpm typecheck`) and
 * never run. Each `@ts-expect-error` must stay an error, or the typecheck fails
 * on the unused directive: that is what pins a wrong `source` as a compile
 * error.
 */
import type { RecordOf } from "@chelone/core";
import { createResourceComponents } from "@chelone/react";
import { expectTypeOf } from "vitest";
import { resources } from "./index";
import { productSchema } from "./products";

const products = createResourceComponents("products");

/** The registry carries the schema itself, so the forms validate against it. */
expectTypeOf(resources.products.schema).toEqualTypeOf(productSchema);

/** The registered record is the schema's output, so `name` is a required string. */
expectTypeOf<
  RecordOf<typeof resources, "products">["name"]
>().toEqualTypeOf<string>();

export function ProductSourceProof() {
  return (
    <>
      <products.TextInput source="name" />
      <products.NumberField source="stock" />
      <products.JsonField source="variants" />

      {/* a typo */}
      {/* @ts-expect-error `title` is no path of a product */}
      <products.TextInput source="title" />

      {/* a path that only posts has */}
      {/* @ts-expect-error `views` belongs to posts, not products */}
      <products.NumberField source="views" />
    </>
  );
}
