/**
 * Pure rules for a record diff. No react, no vue: both DiffViewer adapters
 * mark the same field the same way and print the same default text.
 */

import { isPlainObject, isRecord } from "../guards";
import { getAtPath } from "../resource/get-at-path";
import type { LooseRecord } from "../resource/record";
import type { SourceProp } from "../resource/source-path";
import { deepEqual } from "./deep-equal";

export type DiffStatus = "unchanged" | "added" | "removed" | "changed";

export interface RecordDiffRow<R = LooseRecord> {
  source: SourceProp<R>;
  status: DiffStatus;
  // type-escape: server: a row holds whatever the record held at the source path
  before: unknown;
  // type-escape: server: a row holds whatever the record held at the source path
  after: unknown;
}

// type-escape: server: a guard input; the record type is erased once sources are strings
function topLevelKeys(record: unknown): string[] {
  return isRecord(record) ? Object.keys(record) : [];
}

// type-escape: server: both values come from `getAtPath`, which returns `unknown`
function statusOf(before: unknown, after: unknown): DiffStatus {
  const hadBefore = before != null;
  const hasAfter = after != null;
  if (!hadBefore && !hasAfter) return "unchanged";
  if (!hadBefore) return "added";
  if (!hasAfter) return "removed";
  return deepEqual(before, after) ? "unchanged" : "changed";
}

/**
 * One row per source, in the order given. Without `sources` the rows are the
 * top-level keys of `before` in its order, then the keys only `after` has.
 * `null` and `undefined` both count as missing; an empty string is a value.
 * Neither record is changed.
 */
export function diffRecords<R>(
  before: R,
  after: R,
  sources?: readonly SourceProp<R>[],
): RecordDiffRow<R>[] {
  const beforeKeys = topLevelKeys(before);
  const inferredKeys = [
    ...beforeKeys,
    ...topLevelKeys(after).filter((key) => !beforeKeys.includes(key)),
  ];
  // type-escape: server: Object.keys returns strings, but a record's top-level keys are its source paths
  const keys = sources ?? (inferredKeys as SourceProp<R>[]);
  return keys.map((source) => {
    const was = getAtPath(before, source);
    const now = getAtPath(after, source);
    return { source, status: statusOf(was, now), before: was, after: now };
  });
}

/** The text a viewer shows for a value when the app gives no renderer. */
export function formatDiffValue(
  value: unknown, // type-escape: server: a diffed value is whatever the record held at the path
): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
