import { LatLngField } from "@chelone/react/maps";
import { previewPlace } from "@/docs/mdx/preview-fixtures";
import { PreviewMaps } from "@/docs/mdx/preview-maps";

/** `<LatLngField>` puts a marker on the map where the place's `lat` and `lng` say. */
export default function LatLngFieldDemo() {
  return (
    <PreviewMaps>
      <LatLngField latSource="lat" lngSource="lng" record={previewPlace} />
    </PreviewMaps>
  );
}
