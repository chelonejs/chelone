import { MapWithSearch } from "@chelone/react/maps/osm";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<MapWithSearch>` finds an address, or reads one off a click on the map, and keeps the pin on it. */
export default function MapWithSearchDemo() {
  return (
    <PreviewPlaceForm>
      <MapWithSearch latSource="lat" lngSource="lng" addressSource="address" />
    </PreviewPlaceForm>
  );
}
