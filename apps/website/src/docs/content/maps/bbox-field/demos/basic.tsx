import { BBoxField } from "@chelone/react/maps";
import { previewPlace } from "@/docs/mdx/preview-fixtures";
import { PreviewMaps } from "@/docs/mdx/preview-maps";

/** `<BBoxField>` draws the place's `[west, south, east, north]` box as a rectangle. */
export default function BBoxFieldDemo() {
  return (
    <PreviewMaps>
      <BBoxField
        source="bbox"
        record={previewPlace}
        className="w-full max-w-xl"
      />
    </PreviewMaps>
  );
}
