import { expectTypeOf, it } from "vitest";
import {
  type ArrayBinding,
  type ArrayBindingOptions,
  type ArrayItemOf,
  type ArrayRow,
  createArrayBinding,
} from "./array-binding";
import { type CheloneFormApi, createFormController } from "./form-controller";
import type { FieldBinding } from "./input-binding";

/** One row of `Cart.items`. */
type CartItem = { sku: string | null; qty: number | null };

interface Cart {
  items: CartItem[];
}

/** Two arrays with different row shapes, so the union is not the answer. */
interface Shop {
  items: CartItem[];
  tags: string[];
}

/** An array inside an array. */
interface OrderForm {
  orders: { items: CartItem[] }[];
}

it("the array binding surface carries no `any`", () => {
  const controller = createFormController<Cart>({
    defaultValues: { items: [] },
    save: async () => undefined,
  });
  const binding = createArrayBinding(controller.form, { source: "items" });
  expectTypeOf(binding).not.toBeAny();
  expectTypeOf(binding).toEqualTypeOf<ArrayBinding<Cart, "items">>();
  expectTypeOf(binding.field).toEqualTypeOf<FieldBinding<Cart, "items">>();
  expectTypeOf(binding.getRows()).toEqualTypeOf<readonly ArrayRow[]>();
  expectTypeOf(binding.getTotal()).toEqualTypeOf<number>();
  expectTypeOf(binding.subscribe).parameter(0).toEqualTypeOf<() => void>();
  expectTypeOf(binding.subscribe).returns.toEqualTypeOf<() => void>();
  expectTypeOf(binding.add).parameter(0).toEqualTypeOf<CartItem | undefined>();
  expectTypeOf(binding.add).returns.toBeVoid();
  expectTypeOf(binding.insert).returns.toEqualTypeOf<Promise<void>>();
  expectTypeOf(binding.replace).returns.toEqualTypeOf<Promise<void>>();
  expectTypeOf(binding.remove).returns.toEqualTypeOf<Promise<void>>();
  expectTypeOf(binding.swap).returns.toBeVoid();
  expectTypeOf(binding.reOrder).returns.toBeVoid();
  expectTypeOf(binding.clear).returns.toBeVoid();
  expectTypeOf(binding.destroy).returns.toBeVoid();
});

declare const row: ArrayRow;

it("rows carry stable string ids and index-scoped helpers", () => {
  expectTypeOf(row).not.toBeAny();
  expectTypeOf(row.id).toEqualTypeOf<string>();
  expectTypeOf(row.index).toEqualTypeOf<number>();
  expectTypeOf(row.name).toEqualTypeOf<string>();
  expectTypeOf(row.remove).returns.toEqualTypeOf<Promise<void>>();
  expectTypeOf(row.reOrder).parameter(0).toEqualTypeOf<number>();
  expectTypeOf(row.reOrder).returns.toBeVoid();
});

const typed = () =>
  createFormController<Cart>({
    defaultValues: { items: [] },
    save: async () => undefined,
  });

declare const looseForm: CheloneFormApi<Record<string, unknown>>;

it("createArrayBinding accepts a path of its form's record", () => {
  const controller = typed();
  createArrayBinding(controller.form, { source: "items" });
});

it("createArrayBinding accepts a bracket path", () => {
  const controller = typed();
  createArrayBinding(controller.form, { source: "items[0].sku" });
});

it("createArrayBinding rejects a source that is not a path of the record", () => {
  const controller = typed();
  // @ts-expect-error "nope" is not a path of Cart
  createArrayBinding(controller.form, { source: "nope" });
});

it("createArrayBinding takes any string for a Record<string, unknown> form", () => {
  const composed: string = "anything[3].goes";
  createArrayBinding(looseForm, { source: composed });
});

it("ops take the row type of the binding's own source", () => {
  const controller = createFormController<Shop>({
    defaultValues: { items: [], tags: [] },
    save: async () => undefined,
  });
  const items = createArrayBinding(controller.form, { source: "items" });
  const tags = createArrayBinding(controller.form, { source: "tags" });
  expectTypeOf<ArrayItemOf<Shop, "items">>().toEqualTypeOf<CartItem>();
  expectTypeOf<ArrayItemOf<Shop, "tags">>().toEqualTypeOf<string>();
  expectTypeOf(items.add).parameter(0).toEqualTypeOf<CartItem | undefined>();
  expectTypeOf(items.insert).parameter(1).toEqualTypeOf<CartItem | undefined>();
  expectTypeOf(items.replace).parameter(1).toEqualTypeOf<CartItem>();
  expectTypeOf(tags.add).parameter(0).toEqualTypeOf<string | undefined>();
  items.add({ sku: "a", qty: 1 });
  tags.add("x");
  // @ts-expect-error a Cart row is not a tags row
  tags.add({ sku: "a", qty: 1 });
  // @ts-expect-error a string is not a Cart row
  items.add("x");
});

it("a nested array binding takes its own rows", () => {
  const controller = createFormController<OrderForm>({
    defaultValues: { orders: [] },
    save: async () => undefined,
  });
  const binding = createArrayBinding(controller.form, {
    source: "orders[0].items",
  });
  expectTypeOf(binding.add).parameter(0).toEqualTypeOf<CartItem | undefined>();
  binding.add({ sku: "a", qty: 1 });
  // @ts-expect-error an orders row is not an items row
  binding.add({ items: [] });
});

it("a binding over a form with no array paths takes any item", () => {
  const binding = createArrayBinding(looseForm, { source: "tags" });
  expectTypeOf(binding.add).parameter(0).toEqualTypeOf<unknown>();
  binding.add(5);
  binding.add({ sku: "a", qty: 1 });
});

it("itemDefaults takes a partial of the binding's own row", () => {
  const controller = createFormController<Shop>({
    defaultValues: { items: [], tags: [] },
    save: async () => undefined,
  });
  expectTypeOf<
    ArrayBindingOptions<Shop, "items">["itemDefaults"]
  >().toEqualTypeOf<Partial<CartItem> | undefined>();
  createArrayBinding(controller.form, {
    source: "items",
    itemDefaults: { qty: 1 },
  });
  createArrayBinding(controller.form, { source: "items", itemDefaults: {} });
  createArrayBinding(controller.form, {
    source: "items",
    // @ts-expect-error `price` is no key of a Cart row
    itemDefaults: { price: 1 },
  });
  createArrayBinding(controller.form, {
    source: "items",
    // @ts-expect-error `qty` is a number
    itemDefaults: { qty: "one" },
  });
  createArrayBinding(controller.form, {
    source: "tags",
    // @ts-expect-error a scalar row has no defaults to merge
    itemDefaults: { qty: 1 },
  });
});

it("itemDefaults takes any object for a form that names no record", () => {
  createArrayBinding(looseForm, {
    source: "items",
    itemDefaults: { anything: 1 },
  });
});
