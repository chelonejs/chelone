/**
 * A field's sibling sources name another field of the SAME record and are read
 * as one flat key (`ctx[limitSource]`, `rec[props.countSource]`), so they take
 * `SourceKey` — the record's top-level keys — not a path: a nested path would
 * read `undefined`. `source` is a path and stays `SourceProp` (#749).
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ApiKeyFieldProps } from "./api-key-field";
import type { RatingFieldProps } from "./rating-field";
import type { UsageMeterFieldProps } from "./usage-meter-field";

type Product = {
  id: number;
  apiKey: string;
  rating: number;
  reviewCount: number;
  vendor: { name: string };
  used: number;
  limit: number;
  scopes: string[];
  lastUsedAt: string;
};

declare const product: Product;

describe("sibling source props", () => {
  it("countSource, limitSource, scopesSource and lastUsedSource accept a top-level key", () => {
    const rating: RatingFieldProps<Product> = {
      record: product,
      source: "rating",
      countSource: "reviewCount",
    };
    const meter: UsageMeterFieldProps<Product> = {
      record: product,
      source: "used",
      limitSource: "limit",
    };
    const apiKey: ApiKeyFieldProps<Product> = {
      record: product,
      source: "apiKey",
      scopesSource: "scopes",
      lastUsedSource: "lastUsedAt",
    };
    void [rating, meter, apiKey];
  });

  it("they reject a nested path and a key that is not on the record", () => {
    const rating: RatingFieldProps<Product> = {
      record: product,
      source: "rating",
      // @ts-expect-error "vendor.name" is a path, not a top-level key of Product
      countSource: "vendor.name",
    };
    const ratingTypo: RatingFieldProps<Product> = {
      record: product,
      source: "rating",
      // @ts-expect-error "reviews" is not a key of Product
      countSource: "reviews",
    };
    const meter: UsageMeterFieldProps<Product> = {
      record: product,
      source: "used",
      // @ts-expect-error "limit.max" is a path, not a top-level key of Product
      limitSource: "limit.max",
    };
    const meterTypo: UsageMeterFieldProps<Product> = {
      record: product,
      source: "used",
      // @ts-expect-error "quota" is not a key of Product
      limitSource: "quota",
    };
    const scopes: ApiKeyFieldProps<Product> = {
      record: product,
      source: "apiKey",
      // @ts-expect-error "vendor.name" is a path, not a top-level key of Product
      scopesSource: "vendor.name",
    };
    const scopesTypo: ApiKeyFieldProps<Product> = {
      record: product,
      source: "apiKey",
      // @ts-expect-error "scope" is not a key of Product
      scopesSource: "scope",
    };
    const lastUsed: ApiKeyFieldProps<Product> = {
      record: product,
      source: "apiKey",
      // @ts-expect-error "lastUsedAt.iso" is a path, not a top-level key of Product
      lastUsedSource: "lastUsedAt.iso",
    };
    const lastUsedTypo: ApiKeyFieldProps<Product> = {
      record: product,
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

  it("without a record type they take any string", () => {
    expectTypeOf<RatingFieldProps["countSource"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<UsageMeterFieldProps["limitSource"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<ApiKeyFieldProps["scopesSource"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<ApiKeyFieldProps["lastUsedSource"]>().toEqualTypeOf<
      string | undefined
    >();
  });
});
