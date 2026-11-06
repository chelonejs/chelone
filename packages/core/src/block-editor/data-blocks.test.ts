import { describe, expect, it } from "vitest";
import {
  type BlockSpec,
  createBlockRegistry,
  getBlockDefaultAttrs,
} from "./block-document";
import {
  aggregateChartData,
  chartBlockSpec,
  dataBlockNames,
  formatDataBlockValue,
  pickDataBlockFields,
  recordListBlockSpec,
  referenceRecordBlockSpec,
} from "./data-blocks";

describe("data block specs", () => {
  it("each schema gives shadmin's defaults", () => {
    expect(getBlockDefaultAttrs(referenceRecordBlockSpec.schema)).toEqual({
      resource: "",
      id: null,
      fields: undefined,
      layout: "card",
    });
    expect(getBlockDefaultAttrs(recordListBlockSpec.schema)).toEqual({
      resource: "",
      perPage: 5,
      fields: undefined,
    });
    expect(getBlockDefaultAttrs(chartBlockSpec.schema)).toEqual({
      resource: "",
      type: "bar",
      category: "",
      value: "",
      aggregate: "count",
      perPage: 100,
    });
  });

  it("perPage outside the caps fails the schema", () => {
    const accepts = (spec: Pick<BlockSpec, "schema">, perPage: number) => {
      const result = spec.schema["~standard"].validate({ perPage });
      return !(result instanceof Promise) && result.issues === undefined;
    };
    const ok = (spec: Pick<BlockSpec, "schema">) => (perPage: number) =>
      accepts(spec, perPage);
    const list = ok(recordListBlockSpec);
    const chart = ok(chartBlockSpec);

    expect(list(1)).toBe(true);
    expect(list(50)).toBe(true);
    expect(list(0)).toBe(false);
    expect(list(51)).toBe(false);
    expect(list(2.5)).toBe(false);
    expect(chart(1)).toBe(true);
    expect(chart(1000)).toBe(true);
    expect(chart(0)).toBe(false);
    expect(chart(1001)).toBe(false);
  });

  it("the three specs register with createBlockRegistry", () => {
    const registry = createBlockRegistry([
      referenceRecordBlockSpec,
      recordListBlockSpec,
      chartBlockSpec,
    ]);
    expect(registry.names()).toEqual([...dataBlockNames]);
    expect(dataBlockNames).toEqual(["referenceRecord", "recordList", "chart"]);
    expect(registry.groups()).toEqual(["data"]);
    for (const spec of registry.list()) {
      expect(spec.labelKey).toBe(`chelone.block_editor.${spec.name}.label`);
      expect(spec.descriptionKey).toBe(
        `chelone.block_editor.${spec.name}.description`,
      );
    }
    expect(referenceRecordBlockSpec).toMatchObject({
      label: "Reference record",
      description: "Embed a live record",
      keywords: ["record", "relation", "embed", "reference"],
    });
    expect(recordListBlockSpec).toMatchObject({
      label: "Record list",
      description: "Embed a live list from a resource",
      keywords: ["list", "table", "records", "collection"],
    });
    expect(chartBlockSpec).toMatchObject({
      label: "Chart",
      description: "Aggregate a resource into a chart",
      keywords: ["chart", "graph", "bar", "line", "pie", "analytics"],
    });
  });
});

describe("pickDataBlockFields", () => {
  it("uses the given fields, else every key but id, cut to the limit", () => {
    const record = { id: 1, name: "Ada", city: "London", age: 36 };
    expect(pickDataBlockFields(record, ["age", "name"])).toEqual([
      "age",
      "name",
    ]);
    expect(pickDataBlockFields(record)).toEqual(["name", "city", "age"]);
    expect(pickDataBlockFields(record, [])).toEqual(["name", "city", "age"]);
    expect(pickDataBlockFields(record, undefined, 2)).toEqual(["name", "city"]);
    expect(pickDataBlockFields(record, ["age", "name", "city"], 1)).toEqual([
      "age",
    ]);
  });
});

describe("formatDataBlockValue", () => {
  it("formats null, primitives, objects and a circular value", () => {
    expect(formatDataBlockValue(null)).toBe("");
    expect(formatDataBlockValue(undefined)).toBe("");
    expect(formatDataBlockValue("a")).toBe("a");
    expect(formatDataBlockValue(3)).toBe("3");
    expect(formatDataBlockValue(false)).toBe("false");
    expect(formatDataBlockValue(10n)).toBe("10");
    expect(formatDataBlockValue({ a: [1, 2] })).toBe('{"a":[1,2]}');
    const circular: { self?: object } = {};
    circular.self = circular;
    expect(formatDataBlockValue(circular)).toBe("[object Object]");
  });
});

describe("aggregateChartData", () => {
  const rows = [
    { team: "b", points: 4 },
    { team: "a", points: 1 },
    { team: "b", points: 2 },
  ];

  it("counts, sums and averages by category in first-seen order", () => {
    const spec = { category: "team", value: "points" };
    expect(aggregateChartData(rows, { ...spec, aggregate: "count" })).toEqual([
      { name: "b", value: 2 },
      { name: "a", value: 1 },
    ]);
    expect(aggregateChartData(rows, { ...spec, aggregate: "sum" })).toEqual([
      { name: "b", value: 6 },
      { name: "a", value: 1 },
    ]);
    expect(aggregateChartData(rows, { ...spec, aggregate: "avg" })).toEqual([
      { name: "b", value: 3 },
      { name: "a", value: 1 },
    ]);
    expect(aggregateChartData([], { ...spec, aggregate: "avg" })).toEqual([]);
  });

  it("reads a missing category as empty and a non-numeric value as 0", () => {
    const result = aggregateChartData(
      [
        { points: 5 },
        { team: null, points: 1 },
        { team: "a", points: "n/a" },
        { team: "a", points: "4" },
      ],
      { category: "team", value: "points", aggregate: "sum" },
    );
    expect(result).toEqual([
      { name: "", value: 6 },
      { name: "a", value: 4 },
    ]);
  });
});
