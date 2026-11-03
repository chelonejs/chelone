/**
 * `useGetRecordRepresentation(resource?)` — resolve a record to its display
 * representation (parity: ra-core `useGetRecordRepresentation`). Reads the
 * resource's `recordRepresentation` from the registry definition and applies:
 * - a function → call it with the record;
 * - a string → the value at that (deep) source path off the record;
 * - a React element → returned verbatim;
 * - otherwise the default chain `name → title → label → reference → #${id}`.
 * A nullish record → `""`.
 *
 * The resource is taken from the argument or the ambient `ResourceContext`
 * (`useResourceDefinition` resolves it). Clean-room: the string-path read uses
 * the same segment walker as `useFieldValue` (chelone's zero-lodash footprint).
 */

import { isValidElement, type ReactNode, useCallback } from "react";
import { useResourceDefinition } from "../resource";

/** Read the value at a lodash-style `source` path off `record`. */
function getAtPath(record: unknown, source: string): unknown {
  if (source === "") return record;
  let current: unknown = record;
  const pattern = /\[([^\]]*)\]|[^.[\]]+/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    if (current == null || typeof current !== "object") return undefined;
    const key = match[1] !== undefined ? match[1] : match[0];
    current = (current as Record<string, unknown>)[key];
    match = pattern.exec(source);
  }
  return current;
}

/** A record whose fields the default representation chain probes. */
interface DefaultChainRecord {
  id?: unknown;
  name?: unknown;
  title?: unknown;
  label?: unknown;
  reference?: unknown;
}

/** Whether a default-chain field is a non-empty display value. */
function isPresent(value: unknown): value is string | number {
  return value != null && value !== "";
}

/** The resolver `useGetRecordRepresentation` returns. */
export type GetRecordRepresentation = (record: unknown) => ReactNode;

/** The default chain `name → title → label → reference → #${id}`. */
function defaultRepresentation(record: unknown): string | number {
  const chain = record as DefaultChainRecord;
  if (isPresent(chain.name)) return chain.name;
  if (isPresent(chain.title)) return chain.title;
  if (isPresent(chain.label)) return chain.label;
  if (isPresent(chain.reference)) return chain.reference;
  return `#${String(chain.id)}`;
}

export function useGetRecordRepresentation(
  resource?: string,
): GetRecordRepresentation {
  const { recordRepresentation } = useResourceDefinition({ resource });

  return useCallback(
    (record: unknown): ReactNode => {
      if (record == null) return "";
      if (typeof recordRepresentation === "function") {
        return (recordRepresentation as (r: unknown) => ReactNode)(record);
      }
      if (typeof recordRepresentation === "string") {
        return getAtPath(record, recordRepresentation) as ReactNode;
      }
      if (isValidElement(recordRepresentation)) {
        return recordRepresentation;
      }
      return defaultRepresentation(record);
    },
    [recordRepresentation],
  );
}

/**
 * `useGetRecordRepresentationText(resource?)` is the plain-text form for
 * choice labels and search, where a `ReactNode` cannot go. A string path gives
 * `String` of the value at it (`""` when absent); a function's result is used
 * when it is a string or a number; an element, or any other function result,
 * falls back to the default chain.
 */
export function useGetRecordRepresentationText(
  resource?: string,
): (record: unknown) => string {
  const { recordRepresentation } = useResourceDefinition({ resource });

  return useCallback(
    (record: unknown): string => {
      if (record == null) return "";
      if (typeof recordRepresentation === "function") {
        const result = (recordRepresentation as (r: unknown) => unknown)(
          record,
        );
        if (typeof result === "string" || typeof result === "number") {
          return String(result);
        }
      } else if (typeof recordRepresentation === "string") {
        const value = getAtPath(record, recordRepresentation);
        return value == null ? "" : String(value);
      }
      return String(defaultRepresentation(record));
    },
    [recordRepresentation],
  );
}
