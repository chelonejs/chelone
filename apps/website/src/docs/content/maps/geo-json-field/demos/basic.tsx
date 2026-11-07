import { GeoJsonField } from "@chelone/react/maps";
import { previewPlace } from "@/docs/mdx/preview-fixtures";
import { PreviewMaps } from "@/docs/mdx/preview-maps";

/** `<GeoJsonField>` draws the place's `area` polygon and zooms the map to fit it. */
export default function GeoJsonFieldDemo() {
  return (
    <PreviewMaps>
      <GeoJsonField source="area" record={previewPlace} />
    </PreviewMaps>
  );
}
