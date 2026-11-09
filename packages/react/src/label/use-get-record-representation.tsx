/**
 * `useGetRecordRepresentation(resource?)` — resolve a record to its display
 * representation (parity: ra-core `useGetRecordRepresentation`). Reads the
 * resource's `recordRepresentation` from the registry definition and applies:
 * - a function → call it with the record;
 * - a string → the value at that (deep) source path off the record when it is
 *   text, a number or an element, and `String` of it otherwise (`""` when absent), as the Vue twin does;
 * - a React element → returned verbatim;
 * - otherwise core's `defaultRecordRepresentation`: the default chain
 *   `name → title → label → reference → #${id}`.
 * A nullish record → `""`.
 *
 * The resource is taken from the argument or the ambient `ResourceContext`
 * (`useResourceDefinition` resolves it). Clean-room: the string-path read is
 * core's `getAtPath`, the same reader `useFieldValue` uses (chelone's
 * zero-lodash footprint).
 */

import {
  defaultRecordRepresentation,
  getAtPath,
  isResourceRecord,
  type ResourceRecord,
  textOf,
} from "@chelone/core";
import { isValidElement, type ReactNode, useCallback } from "react";
import type { ChoiceRecord } from "../choices-hooks";
import { useResourceDefinition } from "../resource";

/** The resolver `useGetRecordRepresentation` returns. */
export type GetRecordRepresentation = (
  record: ResourceRecord | null | undefined,
) => ReactNode;

export function useGetRecordRepresentation(
  resource?: string,
): GetRecordRepresentation {
  const { recordRepresentation } = useResourceDefinition({ resource });

  return useCallback(
    (record): ReactNode => {
      if (record == null) return "";
      if (typeof recordRepresentation === "function") {
        return recordRepresentation(record);
      }
      if (typeof recordRepresentation === "string") {
        const value = getAtPath(record, recordRepresentation);
        if (typeof value === "string" || typeof value === "number") {
          return value;
        }
        if (isValidElement(value)) return value;
        return textOf(value);
      }
      if (isValidElement(recordRepresentation)) {
        return recordRepresentation;
      }
      return defaultRecordRepresentation(record);
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
): (record: ResourceRecord | null | undefined) => string {
  const { recordRepresentation } = useResourceDefinition({ resource });

  return useCallback(
    (record): string => {
      if (record == null) return "";
      if (typeof recordRepresentation === "function") {
        const result = recordRepresentation(record);
        if (typeof result === "string" || typeof result === "number") {
          return String(result);
        }
      } else if (typeof recordRepresentation === "string") {
        const value = getAtPath(record, recordRepresentation);
        return textOf(value);
      }
      return String(defaultRecordRepresentation(record));
    },
    [recordRepresentation],
  );
}

/**
 * `useGetChoiceRepresentationText(resource?)` is the text form for a choice
 * input's `optionText`. A choice is a loose bag until a reference loads it, so
 * one that is not a record (no `id`) has no representation and gives `""`.
 */
export function useGetChoiceRepresentationText<
  TChoice extends ChoiceRecord = ChoiceRecord,
>(resource?: string): (choice: TChoice) => string {
  const getText = useGetRecordRepresentationText(resource);
  return useCallback(
    (choice: TChoice): string =>
      isResourceRecord(choice) ? getText(choice) : "",
    [getText],
  );
}
