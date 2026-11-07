import { SimplifyInput } from "@chelone/react/maps/draw";
import { PreviewPlaceForm } from "@/docs/mdx/preview-maps";

/** `<SimplifyInput>` thins the delivery zone as the slider moves, and previews the result. */
export default function SimplifyInputDemo() {
  return (
    <PreviewPlaceForm>
      {/* The zone spans about a hundredth of a degree, so the slider is scaled
          to it and starts at 0: the form holds the zone as it was until moved. */}
      <SimplifyInput
        source="zone"
        label="Delivery zone"
        tolerance={0}
        maxTolerance={0.002}
        step={0.0001}
      />
    </PreviewPlaceForm>
  );
}
