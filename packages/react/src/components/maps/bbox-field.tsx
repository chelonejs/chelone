import { bboxToPolygon } from "@chelone/core";
import { useFieldValue } from "../../record/use-field-value";
import { GeoJsonFieldBody, type GeoJsonFieldProps } from "./geo-json-field";

export type BBoxFieldProps = GeoJsonFieldProps;

/**
 * Shows a `[west, south, east, north]` box from a record as a rectangle on a
 * map. A value that is not four finite numbers shows the empty panel.
 *
 * @example
 * <BBoxField source="bbox" />
 */
export function BBoxField({
  source,
  record,
  defaultValue,
  ...body
}: BBoxFieldProps) {
  const value = useFieldValue({ source, record, defaultValue });
  return <GeoJsonFieldBody value={bboxToPolygon(value)} {...body} />;
}
