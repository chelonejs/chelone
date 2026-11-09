/**
 * The customers demo's typed components, checked by `tsc` (`pnpm typecheck`) and
 * never run. Each `@ts-expect-error` must stay an error, or the typecheck fails
 * on the unused directive: that is what pins a wrong `source` as a compile
 * error. `register-proof.tsx` covers the same path for `posts`,
 * `authors.test-d.tsx` for `authors`; this file covers it for `customers`.
 */
import type { RecordOf } from "@chelone/core";
import { createResourceComponents } from "@chelone/react";
import { expectTypeOf } from "vitest";
import { customerSchema } from "./customers";
import { resources } from "./index";

const customers = createResourceComponents("customers");

/** The registered record is the schema's output, not a loose record. */
expectTypeOf<RecordOf<typeof resources, "customers">>().toEqualTypeOf<{
  id?: number;
  name: string;
  email: string;
  city: string;
  phone?: string;
  joined_on?: string;
  plan?: "free" | "pro" | "team" | "enterprise";
  segment?: "new" | "active" | "at-risk" | "champion";
  usage?: number;
  usage_limit?: number;
}>();

/** The registry carries the schema itself, so the forms validate against it. */
expectTypeOf(resources.customers.schema).toEqualTypeOf(customerSchema);

export function CustomerSourceProof() {
  return (
    <>
      {/* paths the customers schema has */}
      <customers.TextInput source="name" />
      <customers.EmailField source="email" />
      <customers.RecordField source="city" />
      <customers.PhoneInput source="phone" />
      <customers.DateInput source="joined_on" />
      <customers.SelectInput source="segment" choices={[]} />
      <customers.UsageMeterField source="usage" limitSource="usage_limit" />

      {/* a value input takes the value at its `source` */}
      <customers.NumberInput
        source="usage"
        defaultValue={0}
        parse={(text) => Number(text)}
      />

      {/* the value at `usage` is a number */}
      {/* @ts-expect-error `parse` must return what `usage` holds */}
      <customers.NumberInput source="usage" parse={() => "nope"} />

      {/* a typo */}
      {/* @ts-expect-error `nickname` is no path of a customer */}
      <customers.TextInput source="nickname" />

      {/* a path that only orders has */}
      {/* @ts-expect-error `reference` belongs to orders, not customers */}
      <customers.TextInput source="reference" />
    </>
  );
}
