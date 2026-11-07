import { ReverseGeocodeField } from "@chelone/react/maps/osm";
import { previewPlace } from "@/docs/mdx/preview-fixtures";
import { PreviewMaps } from "@/docs/mdx/preview-maps";

/** `<ReverseGeocodeField>` asks the geocoder for the address at the place's `lat` and `lng`. */
export default function ReverseGeocodeFieldDemo() {
  return (
    <PreviewMaps>
      <ReverseGeocodeField
        latSource="lat"
        lngSource="lng"
        record={previewPlace}
      />
    </PreviewMaps>
  );
}
