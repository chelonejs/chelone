import { expectTypeOf, it } from "vitest";
import {
  type ArrayBinding,
  type ArrayRow,
  createArrayBinding,
} from "./array-binding";
import { createFormController } from "./form-controller";
import type { FieldBinding } from "./input-binding";

interface Cart {
  items: { sku: string | null; qty: number | null }[];
}

it("the array binding surface carries no `any`", () => {
  const controller = createFormController<Cart>({
    defaultValues: { items: [] },
    save: async () => undefined,
  });
  const binding = createArrayBinding(controller.form, { source: "items" });
  expectTypeOf(binding).not.toBeAny();
  expectTypeOf(binding).toEqualTypeOf<ArrayBinding<Cart>>();
  expectTypeOf(binding.field).toEqualTypeOf<FieldBinding<Cart>>();
  expectTypeOf(binding.getRows()).toEqualTypeOf<readonly ArrayRow[]>();
  expectTypeOf(binding.getTotal()).toEqualTypeOf<number>();
  expectTypeOf(binding.subscribe).parameter(0).toEqualTypeOf<() => void>();
  expectTypeOf(binding.subscribe).returns.toEqualTypeOf<() => void>();
  expectTypeOf(binding.add).parameter(0).toEqualTypeOf<unknown>();
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
