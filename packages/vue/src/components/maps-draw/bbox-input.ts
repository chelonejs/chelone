import type { ShapeValue } from "@chelone/core";
import { defineComponent, h } from "vue";
import ShapeInput, { type ShapeInputProps } from "./shape-input.vue";

export interface BBoxInputProps
  extends Omit<ShapeInputProps, "kind" | "tools"> {}

/**
 * The props `BBoxInput` forwards to `ShapeInput`: all of them but `kind` and
 * `tools`. A prop it is not given reaches `ShapeInput` as `undefined`, which
 * takes `ShapeInput`'s own default.
 */
export const bboxInputKeys = [
  "source",
  "label",
  "helperText",
  "validate",
  "minVertices",
  "maxVertices",
  "minAreaM2",
  "allowSelfIntersection",
  "snappable",
  "snapDistance",
  "disabled",
  "defaultCenter",
  "zoom",
  "height",
  "mapStyle",
  "shapeStyle",
  "aspectRatio",
  "fitBounds",
  "refine",
  "class",
] as const satisfies readonly (keyof BBoxInputProps)[];

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
 * <BBoxInput source="extent" label="Extent" :aspect-ratio="16 / 9" />
 */
export const BBoxInput = defineComponent(
  (props: BBoxInputProps, { emit }) =>
    () =>
      h(ShapeInput, {
        ...props,
        kind: "BBox",
        tools: ["draw-rectangle", "edit", "move", "delete"],
        onCommit: (value: ShapeValue | null) => emit("commit", value),
      }),
  {
    name: "BBoxInput",
    props: [...bboxInputKeys],
    emits: { commit: (_value: ShapeValue | null) => true },
  },
);
