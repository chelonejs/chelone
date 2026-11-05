import type { Feature, LineString, Point, Polygon } from "geojson";
import { describe, expectTypeOf, it } from "vitest";
import type { JsonObject } from "../guards";
import { type EditorFeature, toEditorFeatures } from "./editor";

describe("editor feature types", () => {
  it("toEditorFeatures returns EditorFeature[]", () => {
    expectTypeOf(toEditorFeatures).returns.toEqualTypeOf<EditorFeature[]>();
  });

  it("an editor feature's properties are a JSON object", () => {
    expectTypeOf<EditorFeature["properties"]>().toEqualTypeOf<JsonObject>();
  });

  it("an editor feature always has an id", () => {
    expectTypeOf<EditorFeature["id"]>().toEqualTypeOf<string | number>();
    expectTypeOf<EditorFeature>().toExtend<
      Feature<Point | LineString | Polygon, JsonObject>
    >();
  });
});
