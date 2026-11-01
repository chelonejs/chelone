import { describe, expect, it } from "vitest";
import { buildRecordTree, type RecordTreeNode } from "./record-tree";

type Row = { id: number | string; [key: string]: unknown };

// Reduces a tree to ids so a test reads as the shape it expects.
type Shape = { id: Row["id"]; children: Shape[] };
const shape = (nodes: RecordTreeNode<Row>[]): Shape[] =>
  nodes.map((node) => ({ id: node.record.id, children: shape(node.children) }));

const leaf = (id: Row["id"]): Shape => ({ id, children: [] });

describe("buildRecordTree", () => {
  it("nests children under their parent in list order", () => {
    const records: Row[] = [
      { id: 1, parent: null },
      { id: 2, parent: 1 },
      { id: 3, parent: null },
      { id: 4, parent: 1 },
      { id: 5, parent: 2 },
    ];
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      {
        id: 1,
        children: [{ id: 2, children: [leaf(5)] }, leaf(4)],
      },
      leaf(3),
    ]);
  });

  it("makes a record with a null, empty or missing parent a root", () => {
    const records: Row[] = [
      { id: 1, parent: null },
      { id: 2, parent: "" },
      { id: 3 },
      { id: 4, parent: undefined },
    ];
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      leaf(1),
      leaf(2),
      leaf(3),
      leaf(4),
    ]);
  });

  it("makes a record whose parent is not in the list a root", () => {
    const records: Row[] = [
      { id: 2, parent: 99 },
      { id: 3, parent: 2 },
    ];
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      { id: 2, children: [leaf(3)] },
    ]);
  });

  it("matches a string parent value to a numeric id", () => {
    const records: Row[] = [
      { id: 1, parent: null },
      { id: 2, parent: "1" },
      { id: "3", parent: 2 },
    ];
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      { id: 1, children: [{ id: 2, children: [leaf("3")] }] },
    ]);
  });

  it("makes a self-parented record a root", () => {
    const records: Row[] = [
      { id: 1, parent: 1 },
      { id: 2, parent: 1 },
    ];
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      { id: 1, children: [leaf(2)] },
    ]);
  });

  it("keeps every record of a two-record cycle, the first as the root", () => {
    const records: Row[] = [
      { id: "a", parent: "b" },
      { id: "b", parent: "a" },
    ];
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      { id: "a", children: [leaf("b")] },
    ]);
  });

  it("keeps every record of a cycle that hangs off no root", () => {
    const records: Row[] = [
      { id: "root", parent: null },
      { id: "c", parent: "a" },
      { id: "a", parent: "b" },
      { id: "b", parent: "c" },
      { id: "d", parent: "b" },
    ];
    // c, a, b form a cycle; c is first in list order.
    expect(shape(buildRecordTree(records, "parent"))).toEqual([
      leaf("root"),
      { id: "c", children: [{ id: "b", children: [leaf("a"), leaf("d")] }] },
    ]);
  });

  it("leaves out a later record that repeats an id", () => {
    const records: Row[] = [
      { id: 1, parent: null, label: "first" },
      { id: 2, parent: 1 },
      { id: 1, parent: 2, label: "second" },
    ];
    const tree = buildRecordTree(records, "parent");
    expect(shape(tree)).toEqual([{ id: 1, children: [leaf(2)] }]);
    expect(tree[0].record.label).toBe("first");
  });

  it("reads a dotted parentSource", () => {
    const records: Row[] = [
      { id: 1, meta: { parent: null } },
      { id: 2, meta: { parent: 1 } },
      { id: 3, meta: null },
    ];
    expect(shape(buildRecordTree(records, "meta.parent"))).toEqual([
      { id: 1, children: [leaf(2)] },
      leaf(3),
    ]);
  });

  it("does not mutate its input", () => {
    const records: Row[] = [
      { id: 1, parent: 2 },
      { id: 2, parent: 1 },
      { id: 3, parent: 1 },
    ];
    const before = structuredClone(records);
    const copy = [...records];
    buildRecordTree(records, "parent");
    expect(records).toEqual(before);
    expect(records.every((record, i) => record === copy[i])).toBe(true);
  });
});
