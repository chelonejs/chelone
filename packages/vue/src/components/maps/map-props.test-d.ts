/**
 * The map components type their props through `defineComponent`'s function
 * form, so a tuple or a union is checked at every `h` call and template use.
 */

import { describe, it } from "vitest";
import { h } from "vue";
import { DrawIcon } from "../maps-draw/draw-icons";
import { MapMarker } from "./use-map";

describe("map component props", () => {
  it("MapMarker takes a [lat, lng] pair", () => {
    h(MapMarker, { position: [1, 2] as const });
    // @ts-expect-error a position has two numbers
    h(MapMarker, { position: [1, 2, 3] as const });
  });

  it("DrawIcon takes a DrawTool or delete", () => {
    h(DrawIcon, { name: "delete" });
    h(DrawIcon, { name: "draw-point" });
    // @ts-expect-error not a DrawTool
    h(DrawIcon, { name: "erase" });
  });
});
