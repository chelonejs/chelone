import { describe, expect, it, vi } from "vitest";
import { type ArrayRow, createArrayBinding } from "./array-binding";
import { createFormController } from "./form-controller";
import { createFieldBinding } from "./input-binding";
import { composeSource } from "./source";
import { required } from "./validators";

interface Tagged {
  tags: string[];
}

interface TaggedHole {
  tags?: string[];
}

interface Line {
  sku: string | null;
  qty: number | null;
}

interface Cart {
  items: Line[];
}

interface Roster {
  people: { name: string }[];
}

interface OrderForm {
  orders: { items: { sku: string | null }[] }[];
}

/** A mounted controller + attached array binding over `tags`. */
const makeTagForm = (tags: string[] = ["a", "b", "c"]) => {
  const save = vi.fn(async (_data: Tagged): Promise<undefined> => undefined);
  const controller = createFormController<Tagged>({
    defaultValues: { tags },
    save,
  });
  controller.subscribe(() => {});
  const binding = createArrayBinding(controller.form, { source: "tags" });
  binding.subscribe(() => {});
  return { controller, binding, save };
};

/** The row at `index`, asserted present (noUncheckedIndexedAccess helper). */
const rowAt = (
  binding: { getRows(): readonly ArrayRow[] },
  index: number,
): ArrayRow => {
  const row = binding.getRows()[index];
  if (row === undefined) throw new Error(`no row at index ${index}`);
  return row;
};

/** id -> value pairing as seen through the rows (the D8 contract). */
const pairing = (
  binding: { getRows(): readonly { id: string; index: number }[] },
  values: () => readonly unknown[],
): [string, unknown][] =>
  binding.getRows().map((row) => [row.id, values()[row.index]]);

describe("createArrayBinding — lifecycle & seeding", () => {
  it("construction is inert: no form writes, no field registration", () => {
    const save = vi.fn(async (): Promise<undefined> => undefined);
    const controller = createFormController<Tagged>({
      defaultValues: { tags: ["a"] },
      save,
    });
    controller.subscribe(() => {});
    const stateBefore = controller.form.store.state;
    createArrayBinding(controller.form, { source: "tags" });
    expect(controller.form.store.state).toBe(stateBefore);
    expect(Object.keys(controller.form.fieldInfo)).not.toContain("tags");
  });

  it("first subscriber seeds the default into a hole without dirtying", () => {
    const controller = createFormController<TaggedHole>({
      defaultValues: {},
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "tags",
      defaultValue: ["a", "b"],
    });
    expect(controller.form.getFieldValue("tags")).toBeUndefined();
    binding.subscribe(() => {});
    expect(controller.form.getFieldValue("tags")).toEqual(["a", "b"]);
    expect(controller.getSnapshot().isDirty).toBe(false);
    expect(controller.form.getFieldMeta("tags")?.isTouched).not.toBe(true);
    expect(binding.getTotal()).toBe(2);
    expect(binding.getRows()).toHaveLength(2);
  });

  it("an existing record value wins over the binding default", () => {
    const controller = createFormController<Tagged>({
      defaultValues: { tags: ["x"] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "tags",
      defaultValue: ["a"],
    });
    binding.subscribe(() => {});
    expect(controller.getSnapshot().values.tags).toEqual(["x"]);
  });

  it("defaultValue defaults to [] — attach materializes the hole", () => {
    const controller = createFormController<TaggedHole>({
      defaultValues: {},
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, { source: "tags" });
    binding.subscribe(() => {});
    expect(controller.form.getFieldValue("tags")).toEqual([]);
    expect(binding.getTotal()).toBe(0);
  });

  it("detached ops seed the default first, then apply", () => {
    const controller = createFormController<TaggedHole>({
      defaultValues: {},
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "tags",
      defaultValue: ["a"],
    });
    binding.add("b");
    expect(controller.form.getFieldValue("tags")).toEqual(["a", "b"]);
  });
});

describe("createArrayBinding — stable row ids follow values (D8)", () => {
  it("getRows is identity-stable across reads and row value edits", () => {
    const { controller, binding } = makeTagForm();
    const rows = binding.getRows();
    expect(binding.getRows()).toBe(rows);
    const row0 = createFieldBinding(controller.form, { source: "tags[0]" });
    row0.subscribe(() => {});
    row0.setValue("z");
    expect(binding.getRows()).toBe(rows);
    binding.add("d");
    expect(binding.getRows()).not.toBe(rows);
  });

  it("rows expose id/index/name; ids are distinct", () => {
    const { binding } = makeTagForm(["a", "b"]);
    const rows = binding.getRows();
    expect(rows.map((row) => row.name)).toEqual(["tags[0]", "tags[1]"]);
    expect(rows.map((row) => row.index)).toEqual([0, 1]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
  });

  it("swap pairs ids with VALUES, not positions (the D8 pin)", () => {
    const { controller, binding } = makeTagForm();
    const [idA, idB, idC] = binding.getRows().map((row) => row.id);
    binding.swap(0, 2);
    const values = () => controller.getSnapshot().values.tags;
    expect(values()).toEqual(["c", "b", "a"]);
    expect(binding.getRows().map((row) => row.id)).toEqual([idC, idB, idA]);
    expect(pairing(binding, values)).toEqual([
      [idC, "c"],
      [idB, "b"],
      [idA, "a"],
    ]);
  });

  it("reOrder (move) carries the id with the moved value", () => {
    const { controller, binding } = makeTagForm();
    const [idA, idB, idC] = binding.getRows().map((row) => row.id);
    binding.reOrder(0, 2);
    expect(controller.getSnapshot().values.tags).toEqual(["b", "c", "a"]);
    expect(binding.getRows().map((row) => row.id)).toEqual([idB, idC, idA]);
  });

  it("insert allocates a fresh id and shifts followers", async () => {
    const { controller, binding } = makeTagForm();
    const [idA, idB, idC] = binding.getRows().map((row) => row.id);
    await binding.insert(1, "x");
    expect(controller.getSnapshot().values.tags).toEqual(["a", "x", "b", "c"]);
    const ids = binding.getRows().map((row) => row.id);
    expect(ids[0]).toBe(idA);
    expect(ids[2]).toBe(idB);
    expect(ids[3]).toBe(idC);
    expect([idA, idB, idC]).not.toContain(ids[1]);
  });

  it("remove drops the row's id and keeps pairing", async () => {
    const { controller, binding } = makeTagForm();
    const [idA, , idC] = binding.getRows().map((row) => row.id);
    await binding.remove(1);
    const values = () => controller.getSnapshot().values.tags;
    expect(values()).toEqual(["a", "c"]);
    expect(pairing(binding, values)).toEqual([
      [idA, "a"],
      [idC, "c"],
    ]);
  });

  it("replace gives the slot a NEW identity (new value = new row)", async () => {
    const { controller, binding } = makeTagForm();
    const [idA, idB, idC] = binding.getRows().map((row) => row.id);
    await binding.replace(1, "y");
    expect(controller.getSnapshot().values.tags).toEqual(["a", "y", "c"]);
    const ids = binding.getRows().map((row) => row.id);
    expect(ids[0]).toBe(idA);
    expect(ids[2]).toBe(idC);
    expect(ids[1]).not.toBe(idB);
  });

  it("add appends a fresh id; clear empties rows and values", () => {
    const { controller, binding } = makeTagForm();
    const before = binding.getRows().map((row) => row.id);
    binding.add("d");
    const after = binding.getRows().map((row) => row.id);
    expect(after.slice(0, 3)).toEqual(before);
    expect(before).not.toContain(after[3]);
    binding.clear();
    expect(binding.getRows()).toEqual([]);
    expect(binding.getTotal()).toBe(0);
    expect(controller.getSnapshot().values.tags).toEqual([]);
  });

  it("row helpers remove/reOrder act at the row's own index", async () => {
    const { controller, binding } = makeTagForm();
    rowAt(binding, 2).reOrder(0);
    expect(controller.getSnapshot().values.tags).toEqual(["c", "a", "b"]);
    await rowAt(binding, 1).remove();
    expect(controller.getSnapshot().values.tags).toEqual(["c", "b"]);
  });

  it("out-of-range remove/swap/replace/reOrder are safe no-ops", async () => {
    const { controller, binding } = makeTagForm();
    const ids = binding.getRows().map((row) => row.id);
    await binding.remove(5);
    binding.swap(0, 9);
    await binding.replace(9, "x");
    binding.reOrder(9, 0);
    expect(controller.getSnapshot().values.tags).toEqual(["a", "b", "c"]);
    expect(binding.getRows().map((row) => row.id)).toEqual(ids);
  });
});

describe("createArrayBinding — structural subscription (_arrayVersion)", () => {
  it("notifies on structural ops, never on row value edits", async () => {
    const { controller, binding } = makeTagForm(["a", "b"]);
    const listener = vi.fn();
    binding.subscribe(listener);
    const row0 = createFieldBinding(controller.form, { source: "tags[0]" });
    row0.subscribe(() => {});

    row0.setValue("z");
    expect(listener).not.toHaveBeenCalled();

    binding.add("c");
    const afterAdd = listener.mock.calls.length;
    expect(afterAdd).toBeGreaterThan(0);

    row0.setValue("zz");
    expect(listener.mock.calls.length).toBe(afterAdd);

    await binding.remove(2);
    expect(listener.mock.calls.length).toBeGreaterThan(afterAdd);
  });
});

describe("createArrayBinding — scalar mode (#20)", () => {
  it("add() pushes '' for scalar rows", () => {
    const { controller, binding } = makeTagForm(["a"]);
    binding.add();
    expect(controller.getSnapshot().values.tags).toEqual(["a", ""]);
  });

  it("declared scalar wins over detection", () => {
    const controller = createFormController<Cart>({
      defaultValues: { items: [{ sku: "a", qty: 1 }] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "items",
      scalar: true,
    });
    binding.subscribe(() => {});
    binding.add();
    expect(controller.getSnapshot().values.items).toEqual([
      { sku: "a", qty: 1 },
      "",
    ]);
  });

  it("remove revalidates and kills ghost errors (parity pin)", async () => {
    const save = vi.fn(async (_data: Tagged): Promise<undefined> => undefined);
    const controller = createFormController<Tagged>({
      defaultValues: { tags: ["ok", ""] },
      save,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, { source: "tags" });
    binding.subscribe(() => {});
    const row0 = createFieldBinding(controller.form, {
      source: "tags[0]",
      validate: required(),
    });
    const row1 = createFieldBinding(controller.form, {
      source: "tags[1]",
      validate: required(),
    });
    row0.subscribe(() => {});
    const unsubRow1 = row1.subscribe(() => {});

    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(row1.getSnapshot().meta.errors.length).toBeGreaterThan(0);

    await binding.remove(1);
    expect(controller.getSnapshot().values.tags).toEqual(["ok"]);
    // The removed row's error must not haunt any surviving row.
    expect(row0.getSnapshot().meta.errors).toEqual([]);
    // Empirical pin (form-core 1.33): the trailing slot's BASE meta and
    // registration are deleted…
    expect(
      Object.keys(controller.form.baseStore.state.fieldMetaBase),
    ).not.toContain("tags[1]");
    expect(Object.keys(controller.form.fieldInfo)).not.toContain("tags[1]");
    // …but the DERIVED fieldMeta map may serve a stale entry for the deleted
    // key (memoization returns the previous map when all surviving entries
    // are unchanged). Whatever it serves must carry NO ghost error.
    expect(controller.form.getFieldMeta("tags[1]")?.errors ?? []).toEqual([]);

    // React would now unmount the removed row — must not throw even though
    // form-core already deleted the field's registration.
    expect(() => unsubRow1()).not.toThrow();

    await controller.submit();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ tags: ["ok"] });
  });
});

describe("createArrayBinding — object mode defaults", () => {
  it("add() nulls the first row's keys", () => {
    const controller = createFormController<Cart>({
      defaultValues: { items: [{ sku: "a", qty: 1 }] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, { source: "items" });
    binding.subscribe(() => {});
    binding.add();
    expect(controller.getSnapshot().values.items).toEqual([
      { sku: "a", qty: 1 },
      { sku: null, qty: null },
    ]);
  });

  it("itemDefaults merge over the nulled template and imply object mode", () => {
    const controller = createFormController<Cart>({
      defaultValues: { items: [{ sku: "a", qty: 1 }] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "items",
      itemDefaults: { qty: 2 },
    });
    binding.subscribe(() => {});
    binding.add();
    expect(controller.getSnapshot().values.items).toEqual([
      { sku: "a", qty: 1 },
      { sku: null, qty: 2 },
    ]);
  });

  it("itemDefaults alone drive the new item on an empty array", () => {
    const controller = createFormController<Roster>({
      defaultValues: { people: [] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "people",
      itemDefaults: { name: "" },
    });
    binding.subscribe(() => {});
    binding.add();
    expect(controller.getSnapshot().values.people).toEqual([{ name: "" }]);
  });

  it("declared object mode on an empty array adds {}", () => {
    const controller = createFormController<Roster>({
      defaultValues: { people: [] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "people",
      scalar: false,
    });
    binding.subscribe(() => {});
    binding.add();
    expect(controller.getSnapshot().values.people).toEqual([{}]);
  });

  it("update() swaps in new itemDefaults", () => {
    const controller = createFormController<Cart>({
      defaultValues: { items: [{ sku: "a", qty: 1 }] },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "items",
      itemDefaults: { qty: 2 },
    });
    binding.subscribe(() => {});
    binding.update({ itemDefaults: { qty: 9 } });
    binding.add();
    expect(controller.getSnapshot().values.items).toEqual([
      { sku: "a", qty: 1 },
      { sku: null, qty: 9 },
    ]);
  });
});

describe("createArrayBinding — nested arrays", () => {
  it("names rows orders[0].items[1] and composes child sources", () => {
    const controller = createFormController<OrderForm>({
      defaultValues: {
        orders: [{ items: [{ sku: "a" }, { sku: "b" }] }],
      },
      save: async () => undefined,
    });
    controller.subscribe(() => {});
    const binding = createArrayBinding(controller.form, {
      source: "orders[0].items",
    });
    binding.subscribe(() => {});
    const rows = binding.getRows();
    expect(rows.map((row) => row.name)).toEqual([
      "orders[0].items[0]",
      "orders[0].items[1]",
    ]);
    const childSource = composeSource(rowAt(binding, 1).name, "sku");
    expect(childSource).toBe("orders[0].items[1].sku");
    const child = createFieldBinding(controller.form, { source: childSource });
    child.subscribe(() => {});
    expect(child.getValue()).toBe("b");

    binding.add();
    expect(controller.getSnapshot().values.orders).toEqual([
      { items: [{ sku: "a" }, { sku: "b" }, { sku: null }] },
    ]);
    binding.swap(0, 1);
    expect(controller.getSnapshot().values.orders).toEqual([
      { items: [{ sku: "b" }, { sku: "a" }, { sku: null }] },
    ]);
  });
});

describe("createArrayBinding — removeFieldValue trailing meta (empirical pin)", () => {
  it("meta shifts up; the trailing row's meta AND registration are deleted", async () => {
    const { controller, binding } = makeTagForm(["a", "b", "c"]);
    const row0 = createFieldBinding(controller.form, { source: "tags[0]" });
    const row1 = createFieldBinding(controller.form, { source: "tags[1]" });
    const row2 = createFieldBinding(controller.form, { source: "tags[2]" });
    row0.subscribe(() => {});
    row1.subscribe(() => {});
    const unsubRow2 = row2.subscribe(() => {});
    row1.setValue("B");
    row2.setValue("C");
    expect(controller.form.getFieldMeta("tags[2]")?.isTouched).toBe(true);

    await binding.remove(0);
    expect(controller.getSnapshot().values.tags).toEqual(["B", "C"]);
    // Meta followed the values up one slot…
    expect(controller.form.getFieldMeta("tags[0]")?.isTouched).toBe(true);
    expect(controller.form.getFieldMeta("tags[1]")?.isTouched).toBe(true);
    // …and the trailing slot's BASE meta + registration were deleted.
    // (Empirical pin, form-core 1.33: the DERIVED fieldMeta map may still
    // serve a stale entry for the deleted key — memoization returns the
    // previous map when all surviving entries are unchanged — so existence
    // must be checked against baseStore/fieldInfo, never getFieldMeta.)
    expect(
      Object.keys(controller.form.baseStore.state.fieldMetaBase),
    ).not.toContain("tags[2]");
    expect(Object.keys(controller.form.fieldInfo)).not.toContain("tags[2]");
    // Unmounting the now-stale trailing row must not throw, and must not
    // resurrect the deleted slot (unmount early-returns on missing info).
    expect(() => unsubRow2()).not.toThrow();
    expect(
      Object.keys(controller.form.baseStore.state.fieldMetaBase),
    ).not.toContain("tags[2]");
  });
});

describe("createArrayBinding — destroy", () => {
  it("is idempotent and blocks re-attach", () => {
    const { controller, binding } = makeTagForm(["a"]);
    binding.destroy();
    binding.destroy();
    const listener = vi.fn();
    binding.subscribe(listener);
    const mountSpy = vi.spyOn(binding.field.field, "mount");
    binding.add("b");
    expect(listener).not.toHaveBeenCalled();
    expect(mountSpy).not.toHaveBeenCalled();
    // Zombie writes stay allowed (FieldBinding.setValue precedent).
    expect(controller.getSnapshot().values.tags).toEqual(["a", "b"]);
  });
});
