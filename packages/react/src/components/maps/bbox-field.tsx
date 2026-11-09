import { bboxToPolygon } from "@chelone/core";
import { useFieldValue } from "../../record/use-field-value";
import { GeoJsonFieldBody, type GeoJsonFieldProps } from "./geo-json-field";

// type-escape: context: without a `record` the paths are loose, as `SourceProp<unknown>` is
export type BBoxFieldProps<RecordType = unknown> =
  GeoJsonFieldProps<RecordType>;

/**
 * Shows a `[west, south, east, north]` box from a record as a rectangle on a
 * map. A value that is not four finite numbers shows the empty panel.
 *
 * @example
 * <BBoxField source="bbox" />
 */
export function BBoxField<RecordType>({
  source,
  record,
  defaultValue,
  ...body
}: BBoxFieldProps<RecordType>) {
  const read: unknown = useFieldValue<RecordType>({ source, record });
  const value = read === undefined ? defaultValue : read;
  return <GeoJsonFieldBody value={bboxToPolygon(value)} {...body} />;
}
