import { BBoxInput } from "@chelone/react/maps/draw";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<BBoxInput>` edits the place's `[west, south, east, north]` box by drawing a rectangle. */
export default function BBoxInputDemo() {
  return (
    <PreviewPlaceForm>
      <BBoxInput source="bbox" label="Bounding box" />
    </PreviewPlaceForm>
  );
}
