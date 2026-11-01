import { describeResource, type ResourceDescriptor } from "@chelone/core";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  toValue,
} from "vue";
import { useCheloneContext } from "../../../context";

/**
 * Describes the Zod schema registered for `resource`, or `undefined` when
 * `<Admin>` has no `registry` prop or the resource has no schema. The guessers
 * build their views from this, never from fetched records.
 */
export function useGuessedResource(
  resource: MaybeRefOrGetter<string>,
): ComputedRef<ResourceDescriptor | undefined> {
  const { resources } = useCheloneContext();
  return computed(() => {
    const name = toValue(resource);
    const config =
      resources && Object.hasOwn(resources, name) ? resources[name] : undefined;
    return describeResource(name, config);
  });
}
