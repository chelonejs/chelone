/**
 * The orders demo's typed components, checked by `tsc` (`pnpm typecheck`) and
 * never run. Each `@ts-expect-error` must stay an error, or the typecheck fails
 * on the unused directive: that is what pins a wrong `source` as a compile
 * error. `register-proof.tsx` covers the same path for `posts`, and
 * `authors.test-d.tsx` for `authors`.
 */
import type { RecordOf } from "@chelone/core";
import { createResourceComponents } from "@chelone/react";
import { expectTypeOf } from "vitest";
import { resources } from "./index";
import { orderSchema } from "./orders";

const orders = createResourceComponents("orders");

/** The registered record is the schema's output, not a loose record. */
expectTypeOf<RecordOf<typeof resources, "orders">>().toEqualTypeOf<{
  id?: number;
  reference: string;
  customer_id: number;
  product_id: number;
  product_ids?: number[];
  quantity: number;
  status: "pending" | "shipped" | "delivered" | "cancelled";
  total: number;
  delivery_at?: string | null;
  slot?: string | null;
  handling?: string | null;
}>();

/** The registry carries the schema itself, so the forms validate against it. */
expectTypeOf(resources.orders.schema).toEqualTypeOf(orderSchema);

export function OrderSourceProof() {
  return (
    <>
      {/* the paths of an order, including a bracket path into the product ids */}
      <orders.TextInput source="reference" />
      <orders.NumberInput source="product_ids[0]" />
      <orders.SelectInput source="status" />
      <orders.TimeInput source="slot" parse={(slot) => slot || null} />

      {/* a typo */}
      {/* @ts-expect-error `referance` is no path of an order */}
      <orders.TextInput source="referance" />

      {/* a path that only customers have */}
      {/* @ts-expect-error `name` belongs to customers, not orders */}
      <orders.TextField source="name" />

      {/* the value at a source types the callbacks that read it */}
      <orders.NumberInput
        source="quantity"
        // @ts-expect-error `quantity` is a number, not a string
        defaultValue={"1"}
      />
      <orders.TimeInput
        source="slot"
        // @ts-expect-error `slot` holds a string, null or undefined, not a number
        parse={(slot) => (slot ? Number.parseInt(slot, 10) : null)}
      />
    </>
  );
}
