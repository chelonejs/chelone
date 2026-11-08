/**
 * Pure rules behind a kanban board: which column holds which record, and what
 * a drop writes back. No react, no vue: both `KanbanBoard` adapters build the
 * same columns from the same records, and a drag handler that decides for
 * itself lets the two boards disagree about the same drop.
 *
 * Drag events stay in the adapters, as `CalendarList` keeps its drag glue
 * beside {@link moveCalendarEvent}.
 */

import type { Identifier } from "../resource/identifier";
import type { LooseRecord, ResourceRecord } from "../resource/record";
import type { SourceKey } from "../resource/source-path";

export interface KanbanColumnDef {
  /** Value written to `groupSource` by a drop into this column. */
  id: string;
  label: string;
  className?: string;
}

export interface KanbanBucket<R> {
  column: KanbanColumnDef;
  records: R[];
}

/**
 * The update a drop asks for, in the shape `update` takes: `data` is the patch
 * and `previousData` the record as it was, so an adapter can undo the drop
 * without a second read.
 */
export interface KanbanMove<R = LooseRecord> {
  id: Identifier;
  data: { [K in SourceKey<R>]?: string };
  previousData: R;
}

/**
 * The column key a record sits under: its group value as a string, with a
 * missing or null value reading as `""`. A top-level key, because a move can
 * only write `{ [source]: value }` — as in {@link getAllowedTransitions}.
 * Read through `Reflect.get`: `SourceKey<R>` of a generic record is a
 * deferred type, so `record[groupSource]` would not typecheck.
 */
function bucketKey<R extends ResourceRecord>(
  record: R,
  groupSource: SourceKey<R>,
): string {
  return String(Reflect.get(record, groupSource) ?? "");
}

/**
 * One bucket per column, in column order, empty columns included. A record
 * lands in the column whose id is its group key; a record that names no column
 * is in no bucket, and records keep list order inside a bucket. A repeated
 * column id keeps the first column's records and leaves the later one empty.
 */
export function buildKanbanBuckets<R extends ResourceRecord>(
  records: readonly R[],
  groupSource: SourceKey<R>,
  columns: readonly KanbanColumnDef[],
): KanbanBucket<R>[] {
  const buckets: KanbanBucket<R>[] = columns.map((column) => ({
    column,
    records: [],
  }));
  const bucketOf = new Map<string, number>();
  columns.forEach((column, index) => {
    if (!bucketOf.has(column.id)) bucketOf.set(column.id, index);
  });
  for (const record of records) {
    const index = bucketOf.get(bucketKey(record, groupSource));
    if (index === undefined) continue;
    const bucket = buckets[index];
    if (bucket) bucket.records.push(record);
  }
  return buckets;
}

/**
 * The update a drop into `targetColumnId` asks for, or `null` when there is
 * nothing to write: the target is not a column, or the record already sits in
 * it. A drop that writes nothing still fires a data-provider `update` on every
 * board that re-renders on a dropped drag, so the adapters ask here first.
 */
export function planKanbanMove<R extends ResourceRecord>(
  record: R,
  groupSource: SourceKey<R>,
  columns: readonly KanbanColumnDef[],
  targetColumnId: string,
): KanbanMove<R> | null {
  if (!columns.some((column) => column.id === targetColumnId)) return null;
  if (bucketKey(record, groupSource) === targetColumnId) return null;
  // type-escape: the computed key is a SourceKey<R>, but TypeScript cannot carry it into the object type
  const data = { [groupSource]: targetColumnId } as KanbanMove<R>["data"];
  return { id: record.id, data, previousData: record };
}
