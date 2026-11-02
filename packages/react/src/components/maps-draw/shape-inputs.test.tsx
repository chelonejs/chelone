/**
 * Tests for the GeoJSON inputs built on ShapeInput. `maplibre-gl` and
 * `terra-draw` are the stand-ins in the `__fixtures__` folders: a test clicks
 * a toolbar button, plays Terra Draw's part on the fake instance (a stored
 * feature appears, then `finish` fires) and asserts the form's value.
 */

import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFake as resetMaps } from "../maps/__fixtures__/fake-maplibre";
import {
  type FakeFeature,
  resetFake as resetDraws,
  type TerraDraw,
} from "./__fixtures__/fake-terra-draw";
import {
  mountShapeInput,
  storedValue,
  toolbarNames,
} from "./__fixtures__/mount-shape-input";
import {
  FeatureCollectionInput,
  FeatureInput,
  GeoJsonInput,
  GeometryCollectionInput,
  LineStringInput,
  MultiLineStringInput,
  MultiPointInput,
  MultiPolygonInput,
  PointInput,
  PolygonInput,
  toolsForShapes,
} from "./shape-inputs";

vi.mock("maplibre-gl", () => import("../maps/__fixtures__/fake-maplibre"));
vi.mock("terra-draw", () => import("./__fixtures__/fake-terra-draw"));
vi.mock(
  "terra-draw-maplibre-gl-adapter",
  () => import("./__fixtures__/fake-terra-draw"),
);

beforeEach(() => {
  resetMaps();
  resetDraws();
});
afterEach(cleanup);

type Geometry = { type: string; coordinates?: unknown };

const point = (x = 0): Geometry => ({ type: "Point", coordinates: [x, x] });
const line = (x = 0): Geometry => ({
  type: "LineString",
  coordinates: [
    [x, x],
    [x + 1, x + 1],
  ],
});
const square = (offset = 0): Geometry => ({
  type: "Polygon",
  coordinates: [
    [
      [offset, offset],
      [offset + 1, offset],
      [offset + 1, offset + 1],
      [offset, offset + 1],
      [offset, offset],
    ],
  ],
});
const holed: Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    [
      [2, 2],
      [3, 2],
      [3, 3],
      [2, 2],
    ],
  ],
};

const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

/** Presses a draw tool, then has the fake draw `geometry` in the tool's mode. */
async function drawWith(
  draw: () => TerraDraw,
  tool: string,
  mode: string,
  geometry: Geometry,
) {
  fireEvent.click(button(tool));
  await act(async () => {
    const id = draw().put(geometry, mode);
    draw().emitFinish(id, "draw", mode);
  });
}

/** Selects the stored feature at `index`, then presses Delete. */
async function deleteStored(draw: () => TerraDraw, index: number) {
  fireEvent.click(button("Edit"));
  const feature: FakeFeature | undefined = draw().features[index];
  if (feature?.id === undefined) throw new Error(`no stored feature ${index}`);
  await act(async () => draw().emitSelect(feature.id as string));
  fireEvent.click(button("Delete"));
}

describe("PointInput", () => {
  it("offers draw-point, move and delete and writes a Point", async () => {
    const { draw } = await mountShapeInput(
      <PointInput source="shape" label="Spot" />,
    );

    expect(toolbarNames()).toEqual(["Draw a point", "Move", "Delete"]);
    await drawWith(draw, "Draw a point", "point", point(3));

    expect(storedValue()).toEqual(point(3));
  });
});

describe("MultiPointInput", () => {
  it("writes a MultiPoint from two drawn points", async () => {
    const { draw } = await mountShapeInput(
      <MultiPointInput source="shape" label="Spots" />,
    );

    expect(toolbarNames()).toEqual(["Draw a point", "Edit", "Move", "Delete"]);
    await drawWith(draw, "Draw a point", "point", point(1));
    await drawWith(draw, "Draw a point", "point", point(2));

    expect(storedValue()).toEqual({
      type: "MultiPoint",
      coordinates: [
        [1, 1],
        [2, 2],
      ],
    });
  });
});

describe("LineStringInput", () => {
  it("offers draw-line and writes a LineString", async () => {
    const { draw } = await mountShapeInput(
      <LineStringInput source="shape" label="Route" />,
    );

    expect(toolbarNames()).toEqual(["Draw a line", "Edit", "Move", "Delete"]);
    await drawWith(draw, "Draw a line", "linestring", line(4));

    expect(storedValue()).toEqual(line(4));
  });
});

describe("MultiLineStringInput", () => {
  it("joins two drawn lines into one MultiLineString", async () => {
    const { draw } = await mountShapeInput(
      <MultiLineStringInput source="shape" label="Routes" />,
    );

    expect(toolbarNames()).toEqual(["Draw a line", "Edit", "Move", "Delete"]);
    await drawWith(draw, "Draw a line", "linestring", line(1));
    await drawWith(draw, "Draw a line", "linestring", line(5));

    expect(storedValue()).toEqual({
      type: "MultiLineString",
      coordinates: [line(1).coordinates, line(5).coordinates],
    });
  });
});

describe("PolygonInput", () => {
  it("offers polygon, rectangle and circle tools and writes a Polygon", async () => {
    const { draw } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" />,
    );

    expect(toolbarNames()).toEqual([
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);
    await drawWith(draw, "Draw a rectangle", "rectangle", square(2));

    expect(storedValue()).toEqual(square(2));
  });

  it("replaces the old polygon with a new drawing", async () => {
    const { draw } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" />,
      square(0),
    );

    await drawWith(draw, "Draw a polygon", "polygon", square(7));

    expect(storedValue()).toEqual(square(7));
    expect(draw().features.map((f) => f.geometry)).toEqual([square(7)]);
  });

  it("uses the tools a caller passes instead of the default", async () => {
    await mountShapeInput(
      <PolygonInput source="shape" tools={["draw-circle", "delete"]} />,
    );

    expect(toolbarNames()).toEqual(["Draw a circle", "Delete"]);
  });
});

describe("MultiPolygonInput", () => {
  const parts = [square(0), square(10), square(20)];
  const multi = (...polygons: Geometry[]) => ({
    type: "MultiPolygon",
    coordinates: polygons.map((p) => p.coordinates),
  });

  it("hydrates a MultiPolygon of 3 parts into 3 features", async () => {
    const { draw } = await mountShapeInput(
      <MultiPolygonInput source="shape" label="Zones" />,
      multi(...parts),
    );

    expect(draw().added[0]?.map((f) => f.geometry)).toEqual(parts);
  });

  it("deleting one part writes a MultiPolygon of the other two", async () => {
    const { draw } = await mountShapeInput(
      <MultiPolygonInput source="shape" label="Zones" />,
      multi(...parts),
    );

    await deleteStored(draw, 1);

    expect(storedValue()).toEqual(
      multi(parts[0] as Geometry, parts[2] as Geometry),
    );
  });

  it("keeps a part with a hole when another part is deleted", async () => {
    const { draw } = await mountShapeInput(
      <MultiPolygonInput source="shape" label="Zones" />,
      multi(holed, parts[1] as Geometry, parts[2] as Geometry),
    );

    // The holed part draws read-only, so the first stored feature is parts[1].
    await deleteStored(draw, 0);

    expect(storedValue()).toEqual(multi(parts[2] as Geometry, holed));
  });
});

describe("GeometryCollectionInput", () => {
  it("keeps every drawn shape", async () => {
    const { draw } = await mountShapeInput(
      <GeometryCollectionInput source="shape" label="Things" />,
    );

    expect(toolbarNames()).toEqual([
      "Draw a point",
      "Draw a line",
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);
    await drawWith(draw, "Draw a point", "point", point(1));
    await drawWith(draw, "Draw a line", "linestring", line(3));

    expect(storedValue()).toEqual({
      type: "GeometryCollection",
      geometries: [point(1), line(3)],
    });
  });
});

describe("GeoJsonInput", () => {
  it("keeps only the latest shape unless collection is set", async () => {
    const single = await mountShapeInput(
      <GeoJsonInput source="shape" label="Shape" />,
    );
    await drawWith(single.draw, "Draw a polygon", "polygon", square(1));
    await drawWith(single.draw, "Draw a point", "point", point(5));
    expect(storedValue()).toEqual(point(5));

    cleanup();
    resetMaps();
    resetDraws();
    const many = await mountShapeInput(
      <GeoJsonInput source="shape" label="Shape" collection />,
    );
    await drawWith(many.draw, "Draw a polygon", "polygon", square(1));
    await drawWith(many.draw, "Draw a point", "point", point(5));
    expect(storedValue()).toEqual({
      type: "GeometryCollection",
      geometries: [square(1), point(5)],
    });
  });

  it("shows a tool for each allowed shape and none for the others", async () => {
    await mountShapeInput(
      <GeoJsonInput source="shape" shapes={["Point", "LineString"]} />,
    );

    expect(toolbarNames()).toEqual([
      "Draw a point",
      "Draw a line",
      "Edit",
      "Move",
      "Delete",
    ]);
  });

  it("offers every shape by default", async () => {
    await mountShapeInput(<GeoJsonInput source="shape" />);

    expect(toolbarNames()).toEqual(
      toolbarNamesFor(["Point", "LineString", "Polygon"]),
    );
    expect(toolbarNames()).toContain("Draw a circle");
  });
});

/** The labels `toolsForShapes` is expected to give, by hand. */
function toolbarNamesFor(shapes: string[]): string[] {
  const labels: Record<string, string[]> = {
    Point: ["Draw a point"],
    LineString: ["Draw a line"],
    Polygon: ["Draw a polygon", "Draw a rectangle", "Draw a circle"],
  };
  const cut = shapes.includes("Polygon") ? ["Cut a hole"] : [];
  return [
    ...shapes.flatMap((s) => labels[s] ?? []),
    ...cut,
    "Edit",
    "Move",
    "Delete",
  ];
}

describe("toolsForShapes", () => {
  it("maps each shape to its draw tools, then edit, move and delete", () => {
    expect(toolsForShapes(["Polygon"])).toEqual([
      "draw-polygon",
      "draw-rectangle",
      "draw-circle",
      "cut",
      "edit",
      "move",
      "delete",
    ]);
    expect(toolsForShapes(["Point", "LineString"])).toEqual([
      "draw-point",
      "draw-line",
      "edit",
      "move",
      "delete",
    ]);
  });

  it("adds cut after the polygon tools for a Polygon or MultiPolygon only", () => {
    expect(toolsForShapes(["MultiPolygon", "Point"])).toEqual([
      "draw-polygon",
      "draw-rectangle",
      "draw-circle",
      "draw-point",
      "cut",
      "edit",
      "move",
      "delete",
    ]);
    expect(toolsForShapes(["LineString"])).not.toContain("cut");
  });

  it("treats a Multi shape as its single shape and lists a tool once", () => {
    expect(toolsForShapes(["MultiPoint", "Point"])).toEqual([
      "draw-point",
      "edit",
      "move",
      "delete",
    ]);
  });
});

describe("FeatureInput", () => {
  it("keeps id and properties when the geometry is edited", async () => {
    const { draw } = await mountShapeInput(
      <FeatureInput source="shape" label="Place" />,
      {
        type: "Feature",
        id: "f1",
        properties: { name: "Park" },
        geometry: square(0),
      },
    );
    expect(toolbarNames()).toEqual([
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);

    fireEvent.click(button("Edit"));
    await act(async () => {
      const id = draw().features[0]?.id as string;
      draw().replace(id, square(4));
      draw().emitFinish(id, "dragCoordinate", "select");
    });

    expect(storedValue()).toEqual({
      type: "Feature",
      id: "f1",
      properties: { name: "Park" },
      geometry: square(4),
    });
  });

  it("picks its tools from shape", async () => {
    await mountShapeInput(<FeatureInput source="shape" shape="LineString" />);

    expect(toolbarNames()).toEqual(["Draw a line", "Edit", "Move", "Delete"]);
  });

  it("writes a Feature with empty properties for a new drawing", async () => {
    const { draw } = await mountShapeInput(
      <FeatureInput source="shape" shape="Point" />,
    );

    await drawWith(draw, "Draw a point", "point", point(2));

    expect(storedValue()).toEqual({
      type: "Feature",
      geometry: point(2),
      properties: {},
    });
  });
});

describe("FeatureCollectionInput", () => {
  const feature = (name: string, geometry: Geometry) => ({
    type: "Feature",
    properties: { name },
    geometry,
  });

  it("keeps each feature's properties after one is deleted", async () => {
    const { draw } = await mountShapeInput(
      <FeatureCollectionInput source="shape" label="Places" />,
      {
        type: "FeatureCollection",
        features: [
          feature("a", point(1)),
          feature("b", point(2)),
          feature("c", point(3)),
        ],
      },
    );

    await deleteStored(draw, 0);

    expect(storedValue()).toEqual({
      type: "FeatureCollection",
      features: [feature("b", point(2)), feature("c", point(3))],
    });
  });

  it("limits its tools to allowedShapes", async () => {
    await mountShapeInput(
      <FeatureCollectionInput source="shape" allowedShapes={["Point"]} />,
    );

    expect(toolbarNames()).toEqual(["Draw a point", "Edit", "Move", "Delete"]);
  });

  it("offers point, line and polygon tools by default", async () => {
    await mountShapeInput(<FeatureCollectionInput source="shape" />);

    expect(toolbarNames()).toEqual(
      toolbarNamesFor(["Point", "LineString", "Polygon"]),
    );
  });
});
