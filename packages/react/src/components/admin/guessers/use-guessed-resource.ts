import { describeResource, type ResourceDescriptor } from "@chelone/core";
import { useMemo } from "react";
import { useCheloneContext } from "../../../context";

/**
 * The fields of a resource's registered Zod schema, or `undefined` when
 * `<Admin>` has no `resources` registry or the resource has no schema to read.
 */
export function useGuessedResource(
  resource: string,
): ResourceDescriptor | undefined {
  const entry = useCheloneContext().resources?.[resource];
  return useMemo(() => describeResource(resource, entry), [resource, entry]);
}
