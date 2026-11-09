import { type SourceProp, toCoordinate } from "@chelone/core";
import { type ComputedRef, computed } from "vue";
import { useFieldValue } from "../../record/use-field-value";

/**
 * The latitude and longitude held in two fields of a record, as numbers or
 * `null` where a field is missing or not a coordinate. The record is the
 * `record` prop, or the ambient one.
 */
export function useCoordinates<TRecord>(options: {
  latSource: SourceProp;
  lngSource: SourceProp;
  record?: TRecord;
}): { lat: ComputedRef<number | null>; lng: ComputedRef<number | null> } {
  // type-escape: context: `source` is the loose `SourceProp`, so the read is untyped
  const latValue = useFieldValue<unknown>({
    source: options.latSource,
    record: options.record,
  });
  // type-escape: context: `source` is the loose `SourceProp`, so the read is untyped
  const lngValue = useFieldValue<unknown>({
    source: options.lngSource,
    record: options.record,
  });
  return {
    lat: computed(() => toCoordinate(latValue.value)),
    lng: computed(() => toCoordinate(lngValue.value)),
  };
}
