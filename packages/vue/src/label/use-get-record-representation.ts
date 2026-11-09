/**
 * `useGetRecordRepresentation(resource?)` — resolve a record to its display
 * representation. The Vue twin of `@chelone/react`'s
 * `label/use-get-record-representation.tsx` (ra-core parity, clean-room).
 *
 * Reads the resource's `recordRepresentation` from the ambient registry and
 * applies:
 * - a function → call it with the record;
 * - a string → the value at that (deep) source path off the record;
 * - otherwise core's `defaultRecordRepresentation`: the default chain
 *   `name → title → label → reference → #${id}`.
 * A nullish record → `""`.
 *
 * The resource comes from the argument or the ambient `<Resource>` name. The
 * registry is optional (a form/field used without `<Admin>` in a unit test):
 * with no registry, only the default chain applies. The string-path read is
 * core's `getAtPath`, the same reader `useFieldValue` uses.
 */

import {
  defaultRecordRepresentation,
  getAtPath,
  type ResourceRecord,
} from "@chelone/core";
import { inject } from "vue";
import { ResourceRegistryKey } from "../admin/resource-registry";
import type { RecordRepresentation } from "../index";
import { useResourceContext } from "../resource-context";

/**
 * Whether the representation is a function to call with the record. A Vue
 * `Component` can also be a function (a functional component, a constructor),
 * and the types cannot tell the two apart, so any function is called as one.
 */
function isRepresentationFunction(
  value: RecordRepresentation,
): value is (record: ResourceRecord) => string | number {
  return typeof value === "function";
}

/** The resolver `useGetRecordRepresentation` returns. */
export type GetRecordRepresentation = (
  record: ResourceRecord | null | undefined,
) => string;

export function useGetRecordRepresentation(
  resource?: string,
): GetRecordRepresentation {
  const name = useResourceContext({ resource });
  const registry = inject(ResourceRegistryKey, null);
  const recordRepresentation = name
    ? registry?.definitions[name]?.recordRepresentation
    : undefined;

  return (record): string => {
    if (record == null) return "";
    if (
      recordRepresentation !== undefined &&
      isRepresentationFunction(recordRepresentation)
    ) {
      return String(recordRepresentation(record) ?? "");
    }
    if (typeof recordRepresentation === "string") {
      return String(getAtPath(record, recordRepresentation) ?? "");
    }
    return String(defaultRecordRepresentation(record));
  };
}
