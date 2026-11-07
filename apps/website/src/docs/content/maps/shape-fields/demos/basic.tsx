import { LineStringField, PolygonField } from "@chelone/react/maps";
import { previewPlace } from "@/docs/mdx/preview-fixtures";
import { PreviewMaps } from "@/docs/mdx/preview-maps";

/** `<PolygonField>` and `<LineStringField>` are `<GeoJsonField>` under the name of the shape they show: a delivery zone and a route. */
export default function ShapeFieldsDemo() {
  return (
    <PreviewMaps>
      <div className="flex flex-col gap-4">
        <PolygonField source="zone" record={previewPlace} />
        <LineStringField source="route" record={previewPlace} />
      </div>
    </PreviewMaps>
  );
}
