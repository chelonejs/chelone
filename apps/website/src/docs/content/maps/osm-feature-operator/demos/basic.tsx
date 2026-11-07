import { PolygonInput } from "@chelone/react/maps/draw";
import { OsmFeatureOperator } from "@chelone/react/maps/osm";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<OsmFeatureOperator>` with `mode="subtract"` cuts the water the Overpass service finds out of the delivery zone. */
export default function OsmFeatureOperatorDemo() {
  return (
    <PreviewPlaceForm>
      <PolygonInput source="zone" label="Delivery zone" />
      <OsmFeatureOperator
        source="zone"
        mode="subtract"
        presets={["water"]}
        label="Remove water from the zone"
      />
    </PreviewPlaceForm>
  );
}
