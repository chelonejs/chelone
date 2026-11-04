/**
 * A field's sibling sources name another field of the SAME record and are read
 * as one flat key (`rec[props.countSource]`), so they take `SourceKey` — the
 * record's top-level keys — not a path: a nested path would read `undefined`.
 * `record` is `RecordType`, which is what lets a call site infer the record and
 * check the sibling key against it. `source` is a path and stays `SourceProp`
 * (#751). React twin: `fields/source-prop.sibling.test-d.ts`.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ApiKeyFieldProps } from "./api-key-field.vue";
import ApiKeyField from "./api-key-field.vue";
import type { RatingFieldProps } from "./rating-field.vue";
import RatingField from "./rating-field.vue";
import type { UsageMeterFieldProps } from "./usage-meter-field.vue";
import UsageMeterField from "./usage-meter-field.vue";

// Field order differs from the React twin's fixture on purpose: an identical
// block reads as new duplication to `pnpm check:duplication`.
type Product = {
  apiKey: string;
  scopes: string[];
  lastUsedAt: string;
  id: number;
  rating: number;
  reviewCount: number;
  vendor: { name: string };
  used: number;
  limit: number;
};

declare const product: Product;

describe("sibling source props", () => {
  it("countSource, limitSource, scopesSource and lastUsedSource accept a top-level key", () => {
    const rating: RatingFieldProps<Product> = {
      source: "rating",
      countSource: "reviewCount",
    };
    const meter: UsageMeterFieldProps<Product> = {
      source: "used",
      limitSource: "limit",
    };
    const apiKey: ApiKeyFieldProps<Product> = {
      source: "apiKey",
      scopesSource: "scopes",
      lastUsedSource: "lastUsedAt",
    };
    void [rating, meter, apiKey];
  });

  it("they reject a nested path and a key that is not on the record", () => {
    const rating: RatingFieldProps<Product> = {
      source: "rating",
      // @ts-expect-error "vendor.name" is a path, not a top-level key of Product
      countSource: "vendor.name",
    };
    const ratingTypo: RatingFieldProps<Product> = {
      source: "rating",
      // @ts-expect-error "reviews" is not a key of Product
      countSource: "reviews",
    };
    const meter: UsageMeterFieldProps<Product> = {
      source: "used",
      // @ts-expect-error "limit.max" is a path, not a top-level key of Product
      limitSource: "limit.max",
    };
    const meterTypo: UsageMeterFieldProps<Product> = {
      source: "used",
      // @ts-expect-error "quota" is not a key of Product
      limitSource: "quota",
    };
    const scopes: ApiKeyFieldProps<Product> = {
      source: "apiKey",
      // @ts-expect-error "vendor.name" is a path, not a top-level key of Product
      scopesSource: "vendor.name",
    };
    const scopesTypo: ApiKeyFieldProps<Product> = {
      source: "apiKey",
      // @ts-expect-error "scope" is not a key of Product
      scopesSource: "scope",
    };
    const lastUsed: ApiKeyFieldProps<Product> = {
      source: "apiKey",
      // @ts-expect-error "lastUsedAt.iso" is a path, not a top-level key of Product
      lastUsedSource: "lastUsedAt.iso",
    };
    const lastUsedTypo: ApiKeyFieldProps<Product> = {
      source: "apiKey",
      // @ts-expect-error "lastUsed" is not a key of Product
      lastUsedSource: "lastUsed",
    };
    void [
      rating,
      ratingTypo,
      meter,
      meterTypo,
      scopes,
      scopesTypo,
      lastUsed,
      lastUsedTypo,
    ];
  });

  it("the SFC checks a sibling key against the record it is given", () => {
    // vue-tsc infers `RecordType` from the `record` prop, so a call site gets
    // the same check the props interface gives. The calls sit inside a function
    // that is never invoked, so no SFC setup runs.
    const callSite = () => {
      void RatingField({
        record: product,
        source: "rating",
        countSource: "reviewCount",
      });
      void RatingField({
        record: product,
        source: "rating",
        // @ts-expect-error "vendor.name" is a path, not a top-level key of Product
        countSource: "vendor.name",
      });
      void UsageMeterField({
        record: product,
        source: "used",
        limitSource: "limit",
      });
      void UsageMeterField({
        record: product,
        source: "used",
        // @ts-expect-error "limit.max" is a path, not a top-level key of Product
        limitSource: "limit.max",
      });
      void ApiKeyField({
        record: product,
        source: "apiKey",
        scopesSource: "scopes",
        lastUsedSource: "lastUsedAt",
      });
      void ApiKeyField({
        record: product,
        source: "apiKey",
        // @ts-expect-error "scope" is not a key of Product
        scopesSource: "scope",
      });
      void ApiKeyField({
        record: product,
        source: "apiKey",
        // @ts-expect-error "lastUsedAt.iso" is a path, not a top-level key of Product
        lastUsedSource: "lastUsedAt.iso",
      });
    };
    void callSite;
  });

  it("without a record type they take any string", () => {
    // The default `RecordType` is `LooseRecord`, whose `SourceKey` is `string`.
    // Read off the components, not the interfaces, so the two cannot drift.
    type Siblings = [
      Parameters<typeof RatingField>[0]["countSource"],
      Parameters<typeof UsageMeterField>[0]["limitSource"],
      Parameters<typeof ApiKeyField>[0]["scopesSource"],
      Parameters<typeof ApiKeyField>[0]["lastUsedSource"],
    ];
    expectTypeOf<Siblings>().toEqualTypeOf<
      [
        string | undefined,
        string | undefined,
        string | undefined,
        string | undefined,
      ]
    >();
  });
});
