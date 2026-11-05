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
 * (`useResourceDefinition` resolves it). Clean-room: the string-path read is
 * core's `getAtPath`, the same reader `useFieldValue` uses (chelone's
 * zero-lodash footprint).
 */

import { getAtPath, isResourceRecord } from "@chelone/core";
import { isValidElement, type ReactNode, useCallback } from "react";
import { useResourceDefinition } from "../resource";

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
      if (
        typeof recordRepresentation === "function" &&
        isResourceRecord(record)
      ) {
        return recordRepresentation(record);
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
        const result = isResourceRecord(record)
          ? recordRepresentation(record)
          : undefined;
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
