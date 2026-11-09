/**
 * The orders demo, built from `createResourceComponents("orders")`: every
 * `source` here is checked against `orderSchema`, so a typo is a compile error
 * and not a blank column at runtime. `orderSchema` is registered in
 * `./index.ts`, which is also what gives the Edit/Create forms their validation
 * for free.
 *
 * `DataTable`, `Toolbar` and `SaveButton` stay plain imports: the factory
 * returns views, fields and inputs, and a table column takes any field name.
 * The children of a reference field stay plain too, because they render against
 * a customer or a product record — only the `ReferenceOneField` back into
 * `orders` types its child, which reads an order.
 */

import { statusChoices } from "@chelone/demo-data";
import {
  ChipField,
  createResourceComponents,
  DataTable,
  SaveButton,
  SingleFieldList,
  TextField,
  Toolbar,
} from "@chelone/react";
import { z } from "zod";

/**
 * The record the views read and the forms validate against. The three nullable
 * fields are the ones their input writes `null` back to: clearing a date, a
 * time or a duration stores null, not an empty string. They are optional too:
 * a create form leaves them out until the user touches them.
 */
export const orderSchema = z.object({
  id: z.number().optional(),
  // Each message covers both ways an input fails: cleared to null (the type
  // error) and left empty or out of range (the check).
  reference: z
    .string({ error: "Reference is required" })
    .min(1, "Reference is required"),
  customer_id: z.number({ error: "Pick a customer" }),
  product_id: z.number({ error: "Pick a product" }),
  product_ids: z.array(z.number({ error: "Pick a product" })).optional(),
  quantity: z
    .number({ error: "Quantity is required" })
    .min(1, "Quantity must be at least 1"),
  status: z.enum(["pending", "shipped", "delivered", "cancelled"], {
    error: "Pick a status",
  }),
  total: z
    .number({ error: "Total is required" })
    .min(0, "Total cannot be negative"),
  delivery_at: z
    .string({ error: "Pick a delivery date" })
    .nullable()
    .optional(),
  slot: z.string().nullable().optional(),
  handling: z.string().nullable().optional(),
});

const orders = createResourceComponents("orders");

/** The customer and the products an order is for. */
function OrderRelationInputs() {
  return (
    <>
      <orders.ReferenceInput source="customer_id" reference="customers">
        <orders.AutocompleteInput optionText="name" label="Customer" />
      </orders.ReferenceInput>
      <orders.ReferenceInput source="product_id" reference="products">
        <orders.SelectInput optionText="name" label="Main product" />
      </orders.ReferenceInput>
      <orders.ReferenceArrayInput source="product_ids" reference="products">
        <orders.AutocompleteArrayInput optionText="name" label="Products" />
      </orders.ReferenceArrayInput>
    </>
  );
}

/** When the order is delivered and how long the warehouse needs to prepare it. */
function OrderDeliveryInputs() {
  return (
    <>
      <orders.DateTimeInput source="delivery_at" label="Delivery" />
      <orders.TimeInput
        source="slot"
        label="Slot opens"
        parse={(time) => time || null}
      />
      <orders.DurationInput
        source="handling"
        label="Handling time"
        units={["h", "m"]}
      />
    </>
  );
}

export function OrderList() {
  return (
    <orders.List>
      <DataTable>
        <DataTable.Col source="reference" />
        <DataTable.Col label="Customer">
          <orders.ReferenceField source="customer_id" reference="customers">
            <TextField source="name" />
          </orders.ReferenceField>
        </DataTable.Col>
        <DataTable.Col label="Product">
          <orders.ReferenceField source="product_id" reference="products">
            <TextField source="name" />
          </orders.ReferenceField>
        </DataTable.Col>
        <DataTable.NumberCol source="quantity" />
        <DataTable.Col source="status">
          <orders.BadgeField source="status" />
        </DataTable.Col>
        <DataTable.NumberCol
          source="total"
          options={{ style: "currency", currency: "USD" }}
        />
      </DataTable>
    </orders.List>
  );
}

export function OrderEdit() {
  return (
    <orders.Edit>
      <orders.TextInput source="reference" />
      <OrderRelationInputs />
      <orders.NumberInput source="quantity" min={1} />
      <OrderDeliveryInputs />
      <orders.SelectInput source="status" choices={statusChoices} />
      <orders.NumberInput source="total" step={0.01} min={0} />
      <Toolbar />
    </orders.Edit>
  );
}

export function OrderCreate() {
  return (
    <orders.Create>
      <orders.TextInput source="reference" />
      <OrderRelationInputs />
      <orders.NumberInput source="quantity" min={1} defaultValue={1} />
      <OrderDeliveryInputs />
      <orders.SelectInput source="status" choices={statusChoices} />
      <orders.NumberInput source="total" step={0.01} min={0} defaultValue={0} />
      <Toolbar>
        <SaveButton />
      </Toolbar>
    </orders.Create>
  );
}

export function OrderShow() {
  return (
    <orders.Show>
      <orders.RecordField source="reference" />
      <orders.RecordField label="Customer">
        <orders.ReferenceField source="customer_id" reference="customers">
          <TextField source="name" />
        </orders.ReferenceField>
      </orders.RecordField>
      <orders.RecordField label="Product">
        <orders.ReferenceField source="product_id" reference="products">
          <TextField source="name" />
        </orders.ReferenceField>
      </orders.RecordField>
      <orders.RecordField label="Products">
        <orders.ReferenceArrayField source="product_ids" reference="products">
          <SingleFieldList>
            <ChipField source="name" />
          </SingleFieldList>
        </orders.ReferenceArrayField>
      </orders.RecordField>
      <orders.RecordField label="Quantity">
        <orders.NumberField source="quantity" />
      </orders.RecordField>
      <orders.RecordField label="Delivery">
        <orders.DateField source="delivery_at" showTime />
      </orders.RecordField>
      <orders.RecordField label="Handling time">
        <orders.DurationField source="handling" displayFormat="relative" />
      </orders.RecordField>
      <orders.RecordField label="Customer's latest order">
        <orders.ReferenceOneField
          reference="orders"
          target="customer_id"
          source="customer_id"
          sort={{ field: "delivery_at", order: "DESC" }}
        >
          <orders.TextField source="reference" />
        </orders.ReferenceOneField>
      </orders.RecordField>
      <orders.RecordField label="Status">
        <orders.BadgeField source="status" />
      </orders.RecordField>
      <orders.RecordField label="Total">
        <orders.NumberField
          source="total"
          options={{ style: "currency", currency: "USD" }}
        />
      </orders.RecordField>
    </orders.Show>
  );
}
