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
 * with no registry, only the default chain applies.
 */

import { inject } from "vue";
import { ResourceRegistryKey } from "../admin/resource-registry";
import { useResourceContext } from "../resource-context";

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
    if (typeof recordRepresentation === "function") {
      return String(
        (recordRepresentation as (r: unknown) => unknown)(record) ?? "",
      );
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
