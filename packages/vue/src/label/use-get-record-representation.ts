/**
 * `useGetRecordRepresentation(resource?)` — resolve a record to its display
 * representation. The Vue twin of `@chelone/react`'s
 * `label/use-get-record-representation.tsx` (ra-core parity, clean-room).
 *
 * Reads the resource's `recordRepresentation` from the ambient registry and
 * applies:
 * - a function → call it with the record;
 * - a string → the value at that (deep) source path off the record;
 * - otherwise the default chain `name → title → label → reference → #${id}`.
 * A nullish record → `""`.
 *
 * The resource comes from the argument or the ambient `<Resource>` name. The
 * registry is optional (a form/field used without `<Admin>` in a unit test):
 * with no registry, only the default chain applies. The string-path read is
 * core's `getAtPath`, the same reader `useFieldValue` uses.
 */

import {
  getAtPath,
  isResourceRecord,
  type ResourceRecord,
  type ResourceRepresentation,
} from "@chelone/core";
import { inject } from "vue";
import { ResourceRegistryKey } from "../admin/resource-registry";
import { useResourceContext } from "../resource-context";

interface DefaultChainRecord {
  id?: unknown;
  name?: unknown;
  title?: unknown;
  label?: unknown;
  reference?: unknown;
}

function isPresent(value: unknown): value is string | number {
  return value != null && value !== "";
}

/**
 * Whether the representation is a function to call with the record. A Vue
 * `Component` can also be a function (a functional component, a constructor),
 * and the types cannot tell the two apart, so any function is called as one.
 */
function isRepresentationFunction(
  value: ResourceRepresentation,
): value is (record: ResourceRecord) => string | number {
  return typeof value === "function";
}

/** The resolver `useGetRecordRepresentation` returns. */
export type GetRecordRepresentation = (record: unknown) => string;

export function useGetRecordRepresentation(
  resource?: string,
): GetRecordRepresentation {
  const name = useResourceContext({ resource });
  const registry = inject(ResourceRegistryKey, null);
  const recordRepresentation = name
    ? registry?.definitions[name]?.recordRepresentation
    : undefined;

  return (record: unknown): string => {
    if (record == null) return "";
    if (
      recordRepresentation !== undefined &&
      isRepresentationFunction(recordRepresentation)
    ) {
      return isResourceRecord(record)
        ? String(recordRepresentation(record) ?? "")
        : "";
    }
    if (typeof recordRepresentation === "string") {
      return String(getAtPath(record, recordRepresentation) ?? "");
    }
    const chain = record as DefaultChainRecord;
    if (isPresent(chain.name)) return String(chain.name);
    if (isPresent(chain.title)) return String(chain.title);
    if (isPresent(chain.label)) return String(chain.label);
    if (isPresent(chain.reference)) return String(chain.reference);
    return `#${String(chain.id)}`;
  };
}
