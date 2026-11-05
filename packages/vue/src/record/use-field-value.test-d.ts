/**
 * `useFieldValue` types its value by the `source` path: inferred from a typed
 * `record` and the literal `source`, `unknown` for the default `LooseRecord`,
 * and the union of the record's value types when only the record type is given
 * (TypeScript infers no path from a partial type-argument list).
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ComputedRef } from "vue";
import { useFieldValue } from "./use-field-value";

interface Invoice {
  total: number;
  customer: { email: string };
}

const invoice: Invoice = { total: 3, customer: { email: "a@b.c" } };

describe("useFieldValue value typing", () => {
  it("accepts a source string and an optional defaultValue", () => {
    const value = useFieldValue({ source: "total", defaultValue: 0 });
    expectTypeOf(value).toEqualTypeOf<ComputedRef<unknown>>();
  });

  it("useFieldValue with a typed record infers the value type from the source", () => {
    const total = useFieldValue({ source: "total", record: invoice });
    const email = useFieldValue({ source: "customer.email", record: invoice });
    expectTypeOf(total).toEqualTypeOf<ComputedRef<number>>();
    expectTypeOf(email).toEqualTypeOf<ComputedRef<string>>();
  });

  it("useFieldValue rejects a source that is not a path of the record", () => {
    // @ts-expect-error "totl" is not a path of Invoice
    useFieldValue({ source: "totl", record: invoice });
  });

  it("useFieldValue with the default LooseRecord returns unknown", () => {
    const value = useFieldValue({ source: "anything" });
    expectTypeOf(value).toEqualTypeOf<ComputedRef<unknown>>();
  });

  it("useFieldValue<Invoice> returns the union of Invoice's value types", () => {
    const value = useFieldValue<Invoice>({ source: "total" });
    expectTypeOf(value).toEqualTypeOf<
      ComputedRef<number | string | { email: string }>
    >();
  });

  it("defaultValue takes the source's value type", () => {
    useFieldValue({
      source: "customer.email",
      record: invoice,
      defaultValue: "",
    });
    useFieldValue({
      source: "customer.email",
      record: invoice,
      // @ts-expect-error a number default for a string source
      defaultValue: 0,
    });
  });
});
