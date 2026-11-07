import { GeocodingInput } from "@chelone/react/maps/osm";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<GeocodingInput>` searches an address and writes the pick to `address`, `lat`, `lng` and `bbox`. */
export default function GeocodingInputDemo() {
  return (
    <PreviewPlaceForm>
      <GeocodingInput
        source="address"
        latSource="lat"
        lngSource="lng"
        bboxSource="bbox"
      />
    </PreviewPlaceForm>
  );
}
