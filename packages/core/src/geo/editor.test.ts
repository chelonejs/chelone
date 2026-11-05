/// <reference types="node" />
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Feature, Geometry, LineString, Point, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { JsonObject } from "../guards";
import {
  EDITOR_PROPERTIES,
  type EditorSnapshotFeature,
  editorStyles,
  fromEditorFeatures,
  toEditorFeatures,
} from "./editor";

const point: Point = { type: "Point", coordinates: [1, 2] };
const line: LineString = {
  type: "LineString",
  coordinates: [
    [0, 0],
    [1, 1],
  ],
};
const polygon: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

function ids() {
  let next = 0;
  return () => `editor-${++next}`;
}

describe("toEditorFeatures", () => {
  it("toEditorFeatures sets mode by geometry type and keeps the source id under chelone:id", () => {
    const features: Feature<Geometry | null, JsonObject | null>[] = [
      { type: "Feature", id: "a", geometry: point, properties: { name: "p" } },
      { type: "Feature", id: 7, geometry: line, properties: null },
      { type: "Feature", geometry: polygon, properties: {} },
    ];
    expect(toEditorFeatures(features, ids())).toEqual([
      {
        type: "Feature",
        id: "editor-1",
        geometry: point,
        properties: {
          mode: "point",
          "chelone:id": "a",
          "chelone:properties": { name: "p" },
        },
      },
      {
        type: "Feature",
        id: "editor-2",
        geometry: line,
        properties: {
          mode: "linestring",
          "chelone:id": 7,
          "chelone:properties": {},
        },
      },
      {
        type: "Feature",
        id: "editor-3",
        geometry: polygon,
        properties: { mode: "polygon", "chelone:properties": {} },
      },
    ]);
  });

  it("toEditorFeatures keeps the source properties whole under chelone:properties", () => {
    const properties: JsonObject = {
      name: "p",
      tags: ["a", "b"],
      nested: { depth: { n: 1, flag: null } },
      mode: "bus",
      "chelone:id": "mine",
    };
    const [feature] = toEditorFeatures(
      [{ type: "Feature", id: "a", geometry: point, properties }],
      ids(),
    );
    expect(feature?.properties).toEqual({
      mode: "point",
      "chelone:id": "a",
      "chelone:properties": properties,
    });
  });

  it("toEditorFeatures gives a fresh id every call and leaves the source alone", () => {
    const source: Feature<Geometry | null, JsonObject | null> = {
      type: "Feature",
      id: "a",
      geometry: point,
      properties: { name: "p" },
    };
    const getId = ids();
    const first = toEditorFeatures([source], getId);
    const second = toEditorFeatures([source], getId);
    expect(first[0]?.id).not.toBe(second[0]?.id);
    expect(source).toEqual({
      type: "Feature",
      id: "a",
      geometry: point,
      properties: { name: "p" },
    });
  });

  it("toEditorFeatures skips features the editor cannot hold", () => {
    const features: Feature<Geometry | null, JsonObject | null>[] = [
      { type: "Feature", geometry: null, properties: {} },
      {
        type: "Feature",
        geometry: { type: "MultiPoint", coordinates: [[0, 0]] },
        properties: {},
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 0],
            ],
            [
              [1, 1],
              [2, 1],
              [2, 2],
              [1, 1],
            ],
          ],
        },
        properties: {},
      },
    ];
    expect(toEditorFeatures(features, ids())).toEqual([]);
  });

  it("rounds positions to 9 decimals", () => {
    const features: Feature<Geometry | null, JsonObject | null>[] = [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [4.360416666666667, 50.85] },
        properties: {},
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [2.3355555555555583, 48.85],
              [2.424444444444442, 48.85],
              [2.424444444444442, 48.9],
              [2.3355555555555583, 48.85],
            ],
          ],
        },
        properties: {},
      },
    ];
    const [pointFeature, polygonFeature] = toEditorFeatures(features, ids());
    expect(pointFeature?.geometry).toEqual({
      type: "Point",
      coordinates: [4.360416667, 50.85],
    });
    expect(polygonFeature?.geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [2.335555556, 48.85],
          [2.424444444, 48.85],
          [2.424444444, 48.9],
          [2.335555556, 48.85],
        ],
      ],
    });
  });

  it("drops an altitude from every position", () => {
    const features: Feature<Geometry | null, JsonObject | null>[] = [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [1, 2, 30] },
        properties: {},
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0, 5, 6],
            [1, 1, 7],
          ],
        },
        properties: {},
      },
    ];
    const [pointFeature, lineFeature] = toEditorFeatures(features, ids());
    expect(pointFeature?.geometry).toEqual({
      type: "Point",
      coordinates: [1, 2],
    });
    expect(lineFeature?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
  });

  it("wraps a longitude past 180 into range", () => {
    const features: Feature<Geometry | null, JsonObject | null>[] = [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [190, 10],
            [-190, 10],
            [540.5, 10],
            [180, 10],
            [-180, 10],
          ],
        },
        properties: {},
      },
    ];
    expect(toEditorFeatures(features, ids())[0]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [-170, 10],
        [170, 10],
        [-179.5, 10],
        [180, 10],
        [-180, 10],
      ],
    });
  });

  it("leaves a value with 9 or fewer decimals equal after a round trip", () => {
    const features: Feature<Geometry | null, JsonObject | null>[] = [
      {
        type: "Feature",
        id: "a",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [4.360416667, 50.123456789],
              [-0.000000001, 50.1],
              [4.36, -50],
              [4.360416667, 50.123456789],
            ],
          ],
        },
        properties: { name: "x" },
      },
    ];
    expect(fromEditorFeatures(toEditorFeatures(features, ids()))).toEqual(
      features,
    );
  });
});

describe("fromEditorFeatures", () => {
  it("fromEditorFeatures drops helper features and the editor's own properties and restores the source id", () => {
    const snapshot: EditorSnapshotFeature[] = [
      {
        type: "Feature",
        id: "editor-1",
        geometry: polygon,
        properties: {
          name: "area",
          mode: "polygon",
          "chelone:id": "a",
          selected: true,
          coordinatePointIds: ["x"],
        },
      },
      ...(
        [
          "selectionPoint",
          "midPoint",
          "closingPoint",
          "snappingPoint",
          "coordinatePoint",
        ] as const
      ).map(
        (flag, index): EditorSnapshotFeature => ({
          type: "Feature",
          id: `helper-${index}`,
          geometry: point,
          properties: { mode: "select", [flag]: true },
        }),
      ),
      {
        type: "Feature",
        id: "drawing",
        geometry: line,
        properties: { mode: "linestring", currentlyDrawing: true },
      },
    ];
    expect(fromEditorFeatures(snapshot)).toEqual([
      {
        type: "Feature",
        id: "a",
        geometry: polygon,
        properties: { name: "area" },
      },
    ]);
  });

  it("fromEditorFeatures keeps a feature the editor marks edited while it is dragged", () => {
    const snapshot = toEditorFeatures(
      [{ type: "Feature", id: "a", geometry: polygon, properties: { k: 1 } }],
      ids(),
    ).map((dragged) => ({
      ...dragged,
      properties: { ...dragged.properties, edited: true, selected: true },
    }));
    expect(fromEditorFeatures(snapshot)).toEqual([
      { type: "Feature", id: "a", geometry: polygon, properties: { k: 1 } },
    ]);
  });

  it("fromEditorFeatures keeps user properties named like the editor's own", () => {
    const source: Feature<Geometry | null, JsonObject | null>[] = [
      {
        type: "Feature",
        id: "a",
        geometry: polygon,
        properties: {
          mode: "bus",
          edited: true,
          selectionPoint: true,
          selected: 1,
        },
      },
    ];
    const editor = toEditorFeatures(source, ids());
    expect(editor[0]?.properties).toMatchObject({ mode: "polygon" });
    expect(fromEditorFeatures(editor)).toEqual(source);
  });

  it("fromEditorFeatures strips the radius a circle writes into a drawn feature", () => {
    expect(
      fromEditorFeatures([
        {
          type: "Feature",
          id: "c",
          geometry: polygon,
          properties: { mode: "circle", radiusKilometers: 2 },
        },
      ]),
    ).toEqual([{ type: "Feature", geometry: polygon, properties: {} }]);
  });

  it("fromEditorFeatures leaves no id on a feature the editor made", () => {
    const result = fromEditorFeatures([
      {
        type: "Feature",
        id: "editor-9",
        geometry: point,
        properties: { mode: "point" },
      },
    ]);
    expect(result).toEqual([
      { type: "Feature", geometry: point, properties: {} },
    ]);
    expect(result[0]).not.toHaveProperty("id");
  });

  it("fromEditorFeatures round-trips toEditorFeatures", () => {
    const source: Feature<Geometry | null, JsonObject | null>[] = [
      { type: "Feature", id: 3, geometry: polygon, properties: { k: "v" } },
      { type: "Feature", geometry: line, properties: {} },
    ];
    expect(fromEditorFeatures(toEditorFeatures(source, ids()))).toEqual(source);
  });

  it("fromEditorFeatures drops a feature whose coordinate is not a finite number and never throws", () => {
    expect(
      fromEditorFeatures([
        {
          type: "Feature",
          id: "x",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [Number.NaN, 0],
                [1, 0],
                [1, 1],
                [Number.NaN, 0],
              ],
            ],
          },
          properties: { mode: "polygon" },
        },
        {
          type: "Feature",
          id: "y",
          geometry: {
            type: "Point",
            coordinates: [Number.POSITIVE_INFINITY, 0],
          },
          properties: { mode: "point" },
        },
      ]),
    ).toEqual([]);
  });

  it("fromEditorFeatures drops a feature whose chelone:properties is not a JSON object", () => {
    expect(
      fromEditorFeatures([
        {
          type: "Feature",
          id: "x",
          geometry: point,
          properties: {
            mode: "point",
            "chelone:id": "a",
            "chelone:properties": 3,
            name: "kept by the editor",
          },
        },
      ]),
    ).toEqual([]);
  });

  it("fromEditorFeatures returns the properties toEditorFeatures stored", () => {
    const properties: JsonObject = {
      name: "area",
      tags: ["a", "b"],
      nested: { depth: { n: 1, flag: null } },
      mode: "bus",
      "chelone:id": "mine",
    };
    const [editor] = toEditorFeatures(
      [{ type: "Feature", id: "a", geometry: polygon, properties }],
      ids(),
    );
    expect(editor).toBeDefined();
    expect(fromEditorFeatures(editor ? [editor] : [])).toEqual([
      { type: "Feature", id: "a", geometry: polygon, properties },
    ]);
  });
});

describe("editorStyles", () => {
  it("editorStyles maps a partial ShapeStyle onto each mode's style keys", () => {
    const styles = editorStyles({
      color: "#112233",
      weight: 4,
      opacity: 0.5,
      fillOpacity: 0.25,
      pointColor: "#445566",
      pointRadius: 6,
    });
    expect(styles.point).toEqual({ pointColor: "#445566", pointWidth: 12 });
    expect(styles.linestring).toEqual({
      lineStringColor: "#112233",
      lineStringWidth: 4,
      lineStringOpacity: 0.5,
    });
    const area = {
      fillColor: "#112233",
      fillOpacity: 0.25,
      outlineColor: "#112233",
      outlineWidth: 4,
      outlineOpacity: 0.5,
    };
    expect(styles.polygon).toEqual(area);
    expect(styles.rectangle).toEqual(area);
    expect(styles.circle).toEqual(area);
    expect(styles.render).toEqual({
      pointColor: "#445566",
      pointWidth: 12,
      lineStringColor: "#112233",
      lineStringWidth: 4,
      lineStringOpacity: 0.5,
      polygonFillColor: "#112233",
      polygonFillOpacity: 0.25,
      polygonOutlineColor: "#112233",
      polygonOutlineWidth: 4,
    });
    expect(styles.select).toEqual({
      selectedPointColor: "#445566",
      selectedPointWidth: 12,
      selectedLineStringColor: "#112233",
      selectedLineStringWidth: 4,
      selectedLineStringOpacity: 0.5,
      selectedPolygonColor: "#112233",
      selectedPolygonFillOpacity: 0.25,
      selectedPolygonOutlineColor: "#112233",
      selectedPolygonOutlineWidth: 4,
      selectedPolygonOutlineOpacity: 0.5,
    });
  });

  it("editorStyles prefers fillColor for the polygon fill", () => {
    const styles = editorStyles({ color: "#111111", fillColor: "#222222" });
    expect(styles.polygon).toEqual({
      fillColor: "#222222",
      outlineColor: "#111111",
    });
  });

  it("editorStyles leaves every mode empty for an empty ShapeStyle", () => {
    for (const mode of Object.values(editorStyles({}))) {
      expect(mode).toEqual({});
    }
  });
});

describe("terra-draw", () => {
  const entry = createRequire(import.meta.url).resolve("terra-draw");
  const bundle = readFileSync(entry, "utf8");
  const modeTypes = (name: string) =>
    readFileSync(
      join(dirname(entry), "modes", name, `${name}.mode.d.ts`),
      "utf8",
    );

  // Every property name the editor helpers read, as terra-draw's own
  // constants spell it. An upgrade that renames one fails here.
  const NAMES = {
    MODE: "mode",
    CURRENTLY_DRAWING: "currentlyDrawing",
    EDITED: "edited",
    CLOSING_POINT: "closingPoint",
    SNAPPING_POINT: "snappingPoint",
    COORDINATE_POINT: "coordinatePoint",
    COORDINATE_POINT_FEATURE_ID: "coordinatePointFeatureId",
    COORDINATE_POINT_IDS: "coordinatePointIds",
    PROVISIONAL_COORDINATE_COUNT: "provisionalCoordinateCount",
    COMMITTED_COORDINATE_COUNT: "committedCoordinateCount",
    MARKER: "marker",
    SELECTED: "selected",
    MID_POINT: "midPoint",
    SELECTION_POINT_FEATURE_ID: "selectionPointFeatureId",
    SELECTION_POINT: "selectionPoint",
  };

  it("pins every editor property name against the installed source", () => {
    for (const [constant, name] of Object.entries(NAMES)) {
      expect(bundle).toContain(`${constant}:"${name}"`);
    }
  });

  it("pins the circle radius property to the installed source", () => {
    expect(bundle).toContain("radiusKilometers:");
  });

  it("pins the names editor.ts uses to that list", () => {
    expect(Object.values(EDITOR_PROPERTIES).sort()).toEqual(
      Object.values(NAMES).sort(),
    );
  });

  it("pins every style key editorStyles writes against the mode's types", () => {
    const styles = editorStyles({
      color: "#111111",
      weight: 1,
      opacity: 1,
      fillColor: "#222222",
      fillOpacity: 1,
      pointColor: "#333333",
      pointRadius: 1,
    });
    for (const [mode, keys] of Object.entries(styles)) {
      const types = modeTypes(mode);
      for (const key of Object.keys(keys)) {
        expect(types, `${mode}.${key}`).toMatch(new RegExp(`\\b${key}:`));
      }
    }
  });
});
