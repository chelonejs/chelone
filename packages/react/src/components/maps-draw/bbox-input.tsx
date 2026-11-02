import { ShapeInput, type ShapeInputProps } from "./shape-input";

export interface BBoxInputProps
  extends Omit<ShapeInputProps, "kind" | "tools"> {}

/**
 * Edits a bounding box, `[west, south, east, north]`, by drawing a rectangle on
 * a map. A new rectangle replaces the old one. With `aspectRatio` the stored
 * box grows around its centre to that width over height, and the rectangle on
 * the map follows it.
 *
 * Needs the optional `maplibre-gl`, `terra-draw` and
 * `terra-draw-maplibre-gl-adapter` peers.
 *
 * @example
 * <BBoxInput source="extent" label="Extent" aspectRatio={16 / 9} />
 */
export function BBoxInput(props: BBoxInputProps) {
  return (
    <ShapeInput
      {...props}
      kind="BBox"
      tools={["draw-rectangle", "edit", "move", "delete"]}
    />
  );
}
