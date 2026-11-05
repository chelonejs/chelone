/**
 * Tests for the GeoJSON inputs built on ShapeInput. `maplibre-gl` and
 * `terra-draw` are the stand-ins in the `__fixtures__` folders: a test clicks
 * a toolbar button, plays Terra Draw's part on the fake instance (a stored
 * feature appears, then `finish` fires) and asserts the form's value.
 */

import type { RoutingProvider } from "@chelone/core";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { Geometry, LineString, Point, Polygon } from "geojson";
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
import type { ShapeInput } from "./shape-input";
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

const point = (x = 0): Point => ({ type: "Point", coordinates: [x, x] });
const line = (x = 0): LineString => ({
  type: "LineString",
  coordinates: [
    [x, x],
    [x + 1, x + 1],
  ],
});
const square = (offset = 0): Polygon => ({
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
const holed: Polygon = {
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
  const parts: [Polygon, Polygon, Polygon] = [
    square(0),
    square(10),
    square(20),
  ];
  const multi = (...polygons: Polygon[]) => ({
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

    expect(storedValue()).toEqual(multi(parts[0], parts[2]));
  });

  it("keeps a part with a hole when another part is deleted", async () => {
    const { draw } = await mountShapeInput(
      <MultiPolygonInput source="shape" label="Zones" />,
      multi(holed, parts[1], parts[2]),
    );

    // The holed part draws read-only, so the first stored feature is parts[1].
    await deleteStored(draw, 0);

    expect(storedValue()).toEqual(multi(parts[2], holed));
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

type Refine = NonNullable<React.ComponentProps<typeof ShapeInput>["refine"]>;

/** A `refine` the test settles by hand, one call at a time. */
function pendingRefine() {
  const calls: {
    value: unknown;
    signal: AbortSignal;
    settle: (result: unknown) => void;
  }[] = [];
  const refine: Refine = (value, { signal }) =>
    new Promise((resolve) => {
      calls.push({ value, signal, settle: resolve as (r: unknown) => void });
    });
  return { refine: vi.fn(refine), calls };
}

describe("ShapeInput refine", () => {
  it("writes a changed result and reseeds the draft", async () => {
    const refine = vi.fn<Refine>(async () => square(5));
    const { draw } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" refine={refine} />,
    );
    await drawWith(draw, "Draw a polygon", "polygon", square(1));

    expect(refine).toHaveBeenCalledTimes(1);
    expect(refine.mock.calls[0]?.[0]).toEqual(square(1));
    expect(refine.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
    expect(storedValue()).toEqual(square(5));
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([square(5)]);
  });

  it("calls onCommit with the refined value after the drawn one", async () => {
    const onCommit = vi.fn();
    const { draw } = await mountShapeInput(
      <PolygonInput
        source="shape"
        label="Area"
        onCommit={onCommit}
        refine={async () => square(5)}
      />,
    );
    await drawWith(draw, "Draw a polygon", "polygon", square(1));

    expect(onCommit.mock.calls.map(([value]) => value)).toEqual([
      square(1),
      square(5),
    ]);
  });

  it("is not called on hydration or reset", async () => {
    const refine = vi.fn<Refine>(async () => square(5));
    const { form } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" refine={refine} />,
      square(1),
    );
    await act(async () => form().form.reset({ shape: square(2) }));
    await act(async () => form().form.setFieldValue("shape", square(3)));

    expect(refine).not.toHaveBeenCalled();
    expect(storedValue()).toEqual(square(3));
  });

  it("aborts the older call when a newer commit arrives", async () => {
    const { refine, calls } = pendingRefine();
    const { draw } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" refine={refine} />,
    );
    await drawWith(draw, "Draw a polygon", "polygon", square(1));
    await drawWith(draw, "Draw a polygon", "polygon", square(2));

    expect(calls).toHaveLength(2);
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(calls[1]?.signal.aborted).toBe(false);

    // The older answer arrives late and is dropped.
    await act(async () => calls[0]?.settle(square(8)));
    expect(storedValue()).toEqual(square(2));
    await act(async () => calls[1]?.settle(square(9)));
    expect(storedValue()).toEqual(square(9));
  });

  it("writes nothing when the field changed meanwhile", async () => {
    const { refine, calls } = pendingRefine();
    const { draw, form } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" refine={refine} />,
    );
    await drawWith(draw, "Draw a polygon", "polygon", square(1));
    await act(async () => form().form.setFieldValue("shape", square(4)));
    await act(async () => calls[0]?.settle(square(9)));

    expect(storedValue()).toEqual(square(4));
  });

  it("aborts the call on unmount and ignores a thrown error", async () => {
    const { refine, calls } = pendingRefine();
    const { draw } = await mountShapeInput(
      <PolygonInput source="shape" label="Area" refine={refine} />,
    );
    await drawWith(draw, "Draw a polygon", "polygon", square(1));
    cleanup();
    expect(calls[0]?.signal.aborted).toBe(true);

    resetMaps();
    resetDraws();
    const failing = await mountShapeInput(
      <PolygonInput
        source="shape"
        label="Area"
        refine={async () => {
          throw new Error("boom");
        }}
      />,
    );
    await drawWith(failing.draw, "Draw a polygon", "polygon", square(1));
    expect(storedValue()).toEqual(square(1));
  });
});

/** Snaps by shifting every position 1 degree east. */
function fakeRouter(
  snap?: (line: LineString) => LineString | null,
): RoutingProvider & { snapToRoad: ReturnType<typeof vi.fn> } {
  return {
    name: "fake",
    snapToRoad: vi.fn(async (l: LineString) =>
      snap
        ? snap(l)
        : ({
            type: "LineString",
            coordinates: l.coordinates.map(([x, y]) => [(x ?? 0) + 1, y ?? 0]),
          } as LineString),
    ),
  };
}

describe("LineStringInput with snapToRoads", () => {
  it("snaps once after a drawn line", async () => {
    const router = fakeRouter();
    const { draw } = await mountShapeInput(
      <LineStringInput source="shape" label="Route" snapToRoads={router} />,
    );
    await drawWith(draw, "Draw a line", "linestring", line(4));

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    expect(router.snapToRoad.mock.calls[0]?.[0]).toEqual(line(4));
    expect(router.snapToRoad.mock.calls[0]?.[1].signal).toBeInstanceOf(
      AbortSignal,
    );
    expect(storedValue()).toEqual({
      type: "LineString",
      coordinates: [
        [5, 4],
        [6, 5],
      ],
    });
    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
  });

  it("leaves a saved line alone on load", async () => {
    const router = fakeRouter();
    const { form } = await mountShapeInput(
      <LineStringInput source="shape" label="Route" snapToRoads={router} />,
      line(2),
    );
    await act(async () => form().form.reset({ shape: line(7) }));

    expect(router.snapToRoad).not.toHaveBeenCalled();
    expect(storedValue()).toEqual(line(7));
  });

  it("true takes the router from MapsProvider and throws an error naming snapToRoads when there is none", async () => {
    const router = fakeRouter();
    const { draw } = await mountShapeInput(
      <LineStringInput source="shape" label="Route" snapToRoads />,
      null,
      { router },
    );
    await drawWith(draw, "Draw a line", "linestring", line(4));
    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    cleanup();

    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      mountShapeInput(
        <LineStringInput source="shape" label="Route" snapToRoads />,
      ),
    ).rejects.toThrow(/snapToRoads.*MapsProvider/);
    quiet.mockRestore();
  });

  it("keeps the drawn line when the snap fails", async () => {
    const router = fakeRouter(() => null);
    const { draw } = await mountShapeInput(
      <LineStringInput source="shape" label="Route" snapToRoads={router} />,
    );
    await drawWith(draw, "Draw a line", "linestring", line(4));

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    expect(storedValue()).toEqual(line(4));
  });

  it("does not write when the snapped line is identical", async () => {
    const router = fakeRouter((l) => ({
      type: "LineString",
      coordinates: l.coordinates.map(([x, y]) => [x ?? 0, y ?? 0]),
    }));
    const { draw, form } = await mountShapeInput(
      <LineStringInput source="shape" label="Route" snapToRoads={router} />,
    );
    await drawWith(draw, "Draw a line", "linestring", line(4));
    const written = form().form.state.values.shape;
    await act(async () => {});

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    expect(form().form.state.values.shape).toBe(written);
  });
});
