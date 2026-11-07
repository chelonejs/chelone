import { ShapeInput } from "@chelone/react/maps/draw";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<ShapeInput>` with `kind="Polygon"` edits the place's delivery zone by drawing on the map. */
export default function ShapeInputDemo() {
  return (
    <PreviewPlaceForm>
      <ShapeInput source="zone" kind="Polygon" label="Delivery zone" />
    </PreviewPlaceForm>
  );
}
