import { z } from "zod";
import type { Attrs, BlockSpec } from "./block-document";

export const dataBlockNames = [
  "referenceRecord",
  "recordList",
  "chart",
] as const;

export type DataBlockName = (typeof dataBlockNames)[number];

/** A data block spec. The keys are always `chelone.block_editor.<name>.label` and `.description`. */
export interface DataBlockSpec<TName extends DataBlockName, A extends Attrs>
  extends BlockSpec<A> {
  name: TName;
  group: "data";
  labelKey: `chelone.block_editor.${TName}.label`;
  descriptionKey: `chelone.block_editor.${TName}.description`;
  description: string;
  keywords: string[];
}

const referenceRecordSchema = z.object({
  resource: z.string().default(""),
  id: z.union([z.string(), z.number()]).nullable().default(null),
  fields: z.array(z.string()).optional(),
  layout: z.enum(["card", "inline"]).default("card"),
});

const recordListSchema = z.object({
  resource: z.string().default(""),
  perPage: z.number().int().min(1).max(50).default(5),
  fields: z.array(z.string()).optional(),
});

const chartSchema = z.object({
  resource: z.string().default(""),
  type: z.enum(["bar", "line", "pie"]).default("bar"),
  category: z.string().default(""),
  value: z.string().default(""),
  aggregate: z.enum(["count", "sum", "avg"]).default("count"),
  perPage: z.number().int().min(1).max(1000).default(100),
});

export const referenceRecordBlockSpec: DataBlockSpec<
  "referenceRecord",
  z.output<typeof referenceRecordSchema>
> = {
  name: "referenceRecord",
  label: "Reference record",
  labelKey: "chelone.block_editor.referenceRecord.label",
  group: "data",
  keywords: ["record", "relation", "embed", "reference"],
  description: "Embed a live record",
  descriptionKey: "chelone.block_editor.referenceRecord.description",
  schema: referenceRecordSchema,
};

export const recordListBlockSpec: DataBlockSpec<
  "recordList",
  z.output<typeof recordListSchema>
> = {
  name: "recordList",
  label: "Record list",
  labelKey: "chelone.block_editor.recordList.label",
  group: "data",
  keywords: ["list", "table", "records", "collection"],
  description: "Embed a live list from a resource",
  descriptionKey: "chelone.block_editor.recordList.description",
  schema: recordListSchema,
};

export const chartBlockSpec: DataBlockSpec<
  "chart",
  z.output<typeof chartSchema>
> = {
  name: "chart",
  label: "Chart",
  labelKey: "chelone.block_editor.chart.label",
  group: "data",
  keywords: ["chart", "graph", "bar", "line", "pie", "analytics"],
  description: "Aggregate a resource into a chart",
  descriptionKey: "chelone.block_editor.chart.description",
  schema: chartSchema,
};

/** The fields a data block shows: the given ones, else every key but `id`, cut to `limit`. */
export function pickDataBlockFields(
  record: object,
  fields?: readonly string[],
  limit?: number,
): string[] {
  const picked =
    fields !== undefined && fields.length > 0
      ? [...fields]
      : Object.keys(record).filter((key) => key !== "id");
  return limit === undefined ? picked : picked.slice(0, limit);
}

// type-escape: server: a record value is whatever the data provider returned
export function formatDataBlockValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object" && typeof value !== "function") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export interface ChartAggregateOptions {
  category: string;
  value: string;
  aggregate: "count" | "sum" | "avg";
}

export interface ChartAggregatePoint {
  name: string;
  value: number;
}

/** A record's own value for a key. A key the record does not own reads as absent. */
// type-escape: server: the key is a runtime string, so the value is not knowable
export const readDataBlockValue = (row: object, key: string): unknown =>
  Object.getOwnPropertyDescriptor(row, key)?.value;

/** Group rows by `String(row[category])` in first-seen order and reduce `value` by the aggregate. */
export function aggregateChartData(
  rows: readonly object[],
  { category, value, aggregate }: ChartAggregateOptions,
): ChartAggregatePoint[] {
  const groups = new Map<string, { count: number; sum: number }>();
  for (const row of rows) {
    const raw = readDataBlockValue(row, category);
    const name = raw === null || raw === undefined ? "" : String(raw);
    const group = groups.get(name) ?? { count: 0, sum: 0 };
    group.count += 1;
    group.sum += Number(readDataBlockValue(row, value)) || 0;
    groups.set(name, group);
  }
  return [...groups].map(([name, { count, sum }]) => ({
    name,
    value:
      aggregate === "count" ? count : aggregate === "sum" ? sum : sum / count,
  }));
}
