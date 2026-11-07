import { LatLngInput } from "@chelone/react/maps";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<LatLngInput>` edits the place's `lat` and `lng` by typing them or by clicking the map. */
export default function LatLngInputDemo() {
  return (
    <PreviewPlaceForm>
      <LatLngInput latSource="lat" lngSource="lng" label="Location" />
    </PreviewPlaceForm>
  );
}
