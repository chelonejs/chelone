/**
 * Tests for the GeoJSON inputs and BBoxInput built on ShapeInput. `maplibre-gl`
 * and `terra-draw` are the stand-ins in the `__fixtures__` folders: a test
 * clicks a toolbar button, plays Terra Draw's part on the fake instance (a
 * stored feature appears, then `finish` fires) and asserts the form's value.
 */

import {
  createI18n,
  fakeDataProvider,
  isGeoGeometry,
  mapMessages,
  type RoutingProvider,
  rasterTileStyle,
  type ShapeValue,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import type {
  Feature,
  Geometry,
  LineString,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import { resetFake as resetMaps } from "../maps/__fixtures__/fake-maplibre";
import { type MapsConfig, MapsProvider } from "../maps/use-map";
import {
  draws,
  type FakeFeature,
  resetFake as resetDraws,
  type TerraDraw,
} from "./__fixtures__/fake-terra-draw";
import { BBoxInput } from "./bbox-input";
import type { ShapeInputProps } from "./shape-input.vue";
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

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

const mounted: VueWrapper[] = [];

beforeEach(() => {
  resetMaps();
  resetDraws();
});
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

type Values = { shape: unknown };

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
/** A rectangle polygon from west, south, east, north. */
const rect = (w: number, s: number, e: number, n: number): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ],
});

/** Mounts `input` as the only field of a form under Admin and the maps provider. */
async function mountShapeInput(
  input: () => VNode,
  shape: ShapeValue | null = null,
  config: Omit<MapsConfig, "mapStyle"> = {},
) {
  let current: UseFormReturn<Values> | undefined;
  const FormHost = defineComponent({
    setup() {
      current = useForm<Values>({
        record: { shape },
        onSubmit: async () => undefined,
      });
      return () => input();
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MapsProvider, { mapStyle: style, ...config }, () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
              i18n: createI18n({
                locale: "en",
                messages: { en: mapMessages },
              }),
            },
            { default: () => h(FormHost) },
          ),
        );
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  // Lets the fake map's microtask `load` fire and Vue render what follows.
  await flushPromises();
  const draw = () => {
    const instance = draws[draws.length - 1];
    if (!instance) throw new Error("no draw instance");
    return instance;
  };
  draw().emitReady();
  await flushPromises();
  return {
    wrapper,
    draw,
    /** Writes `shape` the way code outside the input does. */
    setField: (shape: unknown) => {
      if (!current) throw new Error("form not mounted");
      current.form.setFieldValue("shape", shape);
    },
    reset: (shape: unknown) => {
      if (!current) throw new Error("form not mounted");
      current.reset({ shape });
    },
    value: () => {
      if (!current) throw new Error("form not mounted");
      return current.form.store.state.values.shape;
    },
  };
}

/** The names of the toolbar buttons, in order. */
const toolbarNames = (wrapper: VueWrapper) =>
  wrapper
    .findAll('[role="toolbar"] button')
    .map((b) => b.attributes("aria-label") ?? "");

const button = (wrapper: VueWrapper, name: string) => {
  const found = wrapper
    .findAll("button")
    .find((b) => b.attributes("aria-label") === name);
  if (!found) throw new Error(`no button named ${name}`);
  return found;
};

/** Presses a draw tool, then has the fake draw `geometry` in the tool's mode. */
async function drawWith(
  wrapper: VueWrapper,
  draw: () => TerraDraw,
  tool: string,
  mode: string,
  geometry: Geometry,
) {
  await button(wrapper, tool).trigger("click");
  const id = draw().put(geometry, mode);
  draw().emitFinish(id, "draw", mode);
  await flushPromises();
}

/** Selects the stored feature at `index`, then presses Delete. */
async function deleteStored(
  wrapper: VueWrapper,
  draw: () => TerraDraw,
  index: number,
) {
  await button(wrapper, "Edit").trigger("click");
  const feature: FakeFeature | undefined = draw().features[index];
  if (feature?.id === undefined) throw new Error(`no stored feature ${index}`);
  draw().emitSelect(feature.id);
  await flushPromises();
  await button(wrapper, "Delete").trigger("click");
  await flushPromises();
}

describe("PointInput", () => {
  it("offers draw-point, move and delete and writes a Point", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(PointInput, { source: "shape", label: "Spot" }),
    );

    expect(toolbarNames(wrapper)).toEqual(["Draw a point", "Move", "Delete"]);
    await drawWith(wrapper, draw, "Draw a point", "point", point(3));

    expect(value()).toEqual(point(3));
  });

  it("announces a commit with the stored value", async () => {
    const commits: unknown[] = [];
    const { wrapper, draw } = await mountShapeInput(() =>
      h(PointInput, {
        source: "shape",
        onCommit: (v) => commits.push(v),
      }),
    );

    await drawWith(wrapper, draw, "Draw a point", "point", point(3));

    expect(commits).toEqual([point(3)]);
  });
});

describe("MultiPointInput", () => {
  it("writes a MultiPoint from two drawn points", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(MultiPointInput, { source: "shape", label: "Spots" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a point",
      "Edit",
      "Move",
      "Delete",
    ]);
    await drawWith(wrapper, draw, "Draw a point", "point", point(1));
    await drawWith(wrapper, draw, "Draw a point", "point", point(2));

    expect(value()).toEqual({
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
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(LineStringInput, { source: "shape", label: "Route" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a line",
      "Edit",
      "Move",
      "Delete",
    ]);
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(4));

    expect(value()).toEqual(line(4));
  });
});

describe("MultiLineStringInput", () => {
  it("joins two drawn lines into one MultiLineString", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(MultiLineStringInput, { source: "shape", label: "Routes" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a line",
      "Edit",
      "Move",
      "Delete",
    ]);
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(1));
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(5));

    expect(value()).toEqual({
      type: "MultiLineString",
      coordinates: [line(1).coordinates, line(5).coordinates],
    });
  });
});

describe("PolygonInput", () => {
  it("offers polygon, rectangle and circle tools and writes a Polygon", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", label: "Area" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);
    await drawWith(wrapper, draw, "Draw a rectangle", "rectangle", square(2));

    expect(value()).toEqual(square(2));
  });

  it("replaces the old polygon with a new drawing", async () => {
    const { wrapper, draw, value } = await mountShapeInput(
      () => h(PolygonInput, { source: "shape", label: "Area" }),
      square(0),
    );

    await drawWith(wrapper, draw, "Draw a polygon", "polygon", square(7));

    expect(value()).toEqual(square(7));
    expect(draw().features.map((f) => f.geometry)).toEqual([square(7)]);
  });

  it("uses the tools a caller passes instead of the default", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", tools: ["draw-circle", "delete"] }),
    );

    expect(toolbarNames(wrapper)).toEqual(["Draw a circle", "Delete"]);
  });

  it("passes the other ShapeInput props through", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", label: "Area", disabled: true }),
    );

    expect(wrapper.text()).toContain("Area");
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
  });
});

describe("attributes", () => {
  it("fall through to the fieldset, as they do on ShapeInput", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(PointInput, { source: "shape", id: "loc", "data-testid": "loc" }),
    );

    const fieldset = wrapper.find('[data-slot="shape-input"]');
    expect(fieldset.attributes("id")).toBe("loc");
    expect(fieldset.attributes("data-testid")).toBe("loc");
  });

  it("fall through on BBoxInput too", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(BBoxInput, { source: "shape", id: "box" }),
    );

    expect(wrapper.find('[data-slot="shape-input"]').attributes("id")).toBe(
      "box",
    );
  });
});

describe("MultiPolygonInput", () => {
  const parts: [Polygon, Polygon, Polygon] = [
    square(0),
    square(10),
    square(20),
  ];
  const multi = (...polygons: Polygon[]): MultiPolygon => ({
    type: "MultiPolygon",
    coordinates: polygons.map((p) => p.coordinates),
  });

  it("hydrates a MultiPolygon of 3 parts into 3 features", async () => {
    const { draw } = await mountShapeInput(
      () => h(MultiPolygonInput, { source: "shape", label: "Zones" }),
      multi(...parts),
    );

    expect(draw().added[0]?.map((f) => f.geometry)).toEqual(parts);
  });

  it("deleting one part writes a MultiPolygon of the other two", async () => {
    const { wrapper, draw, value } = await mountShapeInput(
      () => h(MultiPolygonInput, { source: "shape", label: "Zones" }),
      multi(...parts),
    );

    await deleteStored(wrapper, draw, 1);

    expect(value()).toEqual(multi(parts[0], parts[2]));
  });

  it("keeps a part with a hole when another part is deleted", async () => {
    const { wrapper, draw, value } = await mountShapeInput(
      () => h(MultiPolygonInput, { source: "shape", label: "Zones" }),
      multi(holed, parts[1], parts[2]),
    );

    // The holed part draws read-only, so the first stored feature is parts[1].
    await deleteStored(wrapper, draw, 0);

    expect(value()).toEqual(multi(parts[2], holed));
  });
});

describe("GeometryCollectionInput", () => {
  it("keeps every drawn shape", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(GeometryCollectionInput, { source: "shape", label: "Things" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
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
    await drawWith(wrapper, draw, "Draw a point", "point", point(1));
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(3));

    expect(value()).toEqual({
      type: "GeometryCollection",
      geometries: [point(1), line(3)],
    });
  });
});

describe("GeoJsonInput", () => {
  it("keeps only the latest shape unless collection is set", async () => {
    const single = await mountShapeInput(() =>
      h(GeoJsonInput, { source: "shape", label: "Shape" }),
    );
    await drawWith(
      single.wrapper,
      single.draw,
      "Draw a polygon",
      "polygon",
      square(1),
    );
    await drawWith(
      single.wrapper,
      single.draw,
      "Draw a point",
      "point",
      point(5),
    );
    expect(single.value()).toEqual(point(5));

    resetMaps();
    resetDraws();
    const many = await mountShapeInput(() =>
      h(GeoJsonInput, { source: "shape", label: "Shape", collection: true }),
    );
    await drawWith(
      many.wrapper,
      many.draw,
      "Draw a polygon",
      "polygon",
      square(1),
    );
    await drawWith(many.wrapper, many.draw, "Draw a point", "point", point(5));
    expect(many.value()).toEqual({
      type: "GeometryCollection",
      geometries: [square(1), point(5)],
    });
  });

  it("shows a tool for each allowed shape and none for the others", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(GeoJsonInput, { source: "shape", shapes: ["Point", "LineString"] }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a point",
      "Draw a line",
      "Edit",
      "Move",
      "Delete",
    ]);
  });

  it("offers every shape by default", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(GeoJsonInput, { source: "shape" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
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
  });
});

describe("toolsForShapes", () => {
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
    const { wrapper, draw, value } = await mountShapeInput(
      () => h(FeatureInput, { source: "shape", label: "Place" }),
      {
        type: "Feature",
        id: "f1",
        properties: { name: "Park" },
        geometry: square(0),
      },
    );
    expect(toolbarNames(wrapper)).toEqual([
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);

    await button(wrapper, "Edit").trigger("click");
    const id = defined(draw().features[0]?.id);
    draw().replace(id, square(4));
    draw().emitFinish(id, "dragCoordinate", "select");
    await flushPromises();

    expect(value()).toEqual({
      type: "Feature",
      id: "f1",
      properties: { name: "Park" },
      geometry: square(4),
    });
  });

  it("picks its tools from shape", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(FeatureInput, { source: "shape", shape: "LineString" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a line",
      "Edit",
      "Move",
      "Delete",
    ]);
  });

  it("writes a Feature with empty properties for a new drawing", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(FeatureInput, { source: "shape", shape: "Point" }),
    );

    await drawWith(wrapper, draw, "Draw a point", "point", point(2));

    expect(value()).toEqual({
      type: "Feature",
      geometry: point(2),
      properties: {},
    });
  });
});

describe("FeatureCollectionInput", () => {
  const feature = (
    name: string,
    geometry: Geometry,
  ): Feature<Geometry, { name: string }> => ({
    type: "Feature",
    properties: { name },
    geometry,
  });

  it("keeps each feature's properties after one is deleted", async () => {
    const { wrapper, draw, value } = await mountShapeInput(
      () => h(FeatureCollectionInput, { source: "shape", label: "Places" }),
      {
        type: "FeatureCollection",
        features: [
          feature("a", point(1)),
          feature("b", point(2)),
          feature("c", point(3)),
        ],
      },
    );

    await deleteStored(wrapper, draw, 0);

    expect(value()).toEqual({
      type: "FeatureCollection",
      features: [feature("b", point(2)), feature("c", point(3))],
    });
  });

  it("limits its tools to allowedShapes", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(FeatureCollectionInput, { source: "shape", allowedShapes: ["Point"] }),
    );

    expect(toolbarNames(wrapper)).toEqual([
      "Draw a point",
      "Edit",
      "Move",
      "Delete",
    ]);
  });

  it("offers point, line and polygon tools by default", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(FeatureCollectionInput, { source: "shape" }),
    );

    expect(toolbarNames(wrapper)).toEqual([
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
  });
});

describe("BBoxInput", () => {
  it("stores [west, south, east, north] for a drawn rectangle", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(BBoxInput, { source: "shape", label: "Extent" }),
    );
    expect(toolbarNames(wrapper)).toEqual([
      "Draw a rectangle",
      "Edit",
      "Move",
      "Delete",
    ]);

    await drawWith(
      wrapper,
      draw,
      "Draw a rectangle",
      "rectangle",
      rect(-2, 10, 6, 14),
    );

    expect(value()).toEqual([-2, 10, 6, 14]);
  });

  it("hydrates a stored bbox as one rectangle", async () => {
    const { draw } = await mountShapeInput(
      () => h(BBoxInput, { source: "shape", label: "Extent" }),
      [-2, 10, 6, 14],
    );

    expect(draw().added).toHaveLength(1);
    const added = draw().added[0] ?? [];
    expect(added).toHaveLength(1);
    const geometry = defined(added[0]).geometry;
    if (!isGeoGeometry(geometry) || geometry.type !== "Polygon") {
      throw new Error("Expected a Polygon");
    }
    const ring = defined(geometry.coordinates[0]);
    const xs = ring.map((c) => defined(c[0]));
    const ys = ring.map((c) => defined(c[1]));
    expect([
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ]).toEqual([-2, 10, 6, 14]);
  });

  it("replaces the old rectangle with a new one", async () => {
    const { wrapper, draw, value } = await mountShapeInput(
      () => h(BBoxInput, { source: "shape" }),
      [0, 0, 1, 1],
    );

    await drawWith(
      wrapper,
      draw,
      "Draw a rectangle",
      "rectangle",
      rect(5, 5, 7, 8),
    );

    expect(value()).toEqual([5, 5, 7, 8]);
    expect(draw().features).toHaveLength(1);
  });

  it("locks the width over height ratio and redraws the locked rectangle", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(BBoxInput, { source: "shape", aspectRatio: 2 }),
    );

    // 4 wide and 4 high: grows to 8 wide around the centre, never shrinks.
    await drawWith(
      wrapper,
      draw,
      "Draw a rectangle",
      "rectangle",
      rect(0, 0, 4, 4),
    );

    expect(value()).toEqual([-2, 0, 6, 4]);
    const shown = draw().getSnapshot();
    expect(shown).toHaveLength(1);
    const geometry = defined(shown[0]).geometry;
    if (!isGeoGeometry(geometry) || geometry.type !== "Polygon") {
      throw new Error("Expected a Polygon");
    }
    const ring = defined(geometry.coordinates[0]);
    const xs = ring.map((c) => defined(c[0]));
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-2, 6]);
  });
});

type Refine = NonNullable<ShapeInputProps["refine"]>;

/** A `refine` the test settles by hand, one call at a time. */
function pendingRefine() {
  const calls: {
    value: unknown;
    signal: AbortSignal;
    settle: (result: Awaited<ReturnType<Refine>>) => void;
  }[] = [];
  const refine: Refine = (value, { signal }) =>
    new Promise<Awaited<ReturnType<Refine>>>((resolve) => {
      calls.push({ value, signal, settle: resolve });
    });
  return { refine: vi.fn(refine), calls };
}

describe("ShapeInput refine", () => {
  it("writes a changed result and reseeds the draft", async () => {
    const refine = vi.fn<Refine>(async () => square(5));
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", label: "Area", refine }),
    );
    await drawWith(wrapper, draw, "Draw a polygon", "polygon", square(1));

    expect(refine).toHaveBeenCalledTimes(1);
    expect(refine.mock.calls[0]?.[0]).toEqual(square(1));
    expect(refine.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
    expect(value()).toEqual(square(5));
    expect(draw().features.map((f) => f.geometry)).toEqual([square(5)]);
  });

  it("is not called on hydration or reset", async () => {
    const refine = vi.fn<Refine>(async () => square(5));
    const { setField, reset, value } = await mountShapeInput(
      () => h(PolygonInput, { source: "shape", label: "Area", refine }),
      square(1),
    );
    reset(square(2));
    await flushPromises();
    setField(square(3));
    await flushPromises();

    expect(refine).not.toHaveBeenCalled();
    expect(value()).toEqual(square(3));
  });

  it("aborts the older call when a newer commit arrives", async () => {
    const { refine, calls } = pendingRefine();
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", label: "Area", refine }),
    );
    await drawWith(wrapper, draw, "Draw a polygon", "polygon", square(1));
    await drawWith(wrapper, draw, "Draw a polygon", "polygon", square(2));

    expect(calls).toHaveLength(2);
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(calls[1]?.signal.aborted).toBe(false);

    // The older answer arrives late and is dropped.
    calls[0]?.settle(square(8));
    await flushPromises();
    expect(value()).toEqual(square(2));
    calls[1]?.settle(square(9));
    await flushPromises();
    expect(value()).toEqual(square(9));
  });

  it("writes nothing when the field changed meanwhile", async () => {
    const { refine, calls } = pendingRefine();
    const { wrapper, draw, setField, value } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", label: "Area", refine }),
    );
    await drawWith(wrapper, draw, "Draw a polygon", "polygon", square(1));
    setField(square(4));
    await flushPromises();
    calls[0]?.settle(square(9));
    await flushPromises();

    expect(value()).toEqual(square(4));
  });

  it("aborts the call on unmount and ignores a thrown error", async () => {
    const { refine, calls } = pendingRefine();
    const first = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", label: "Area", refine }),
    );
    await drawWith(
      first.wrapper,
      first.draw,
      "Draw a polygon",
      "polygon",
      square(1),
    );
    first.wrapper.unmount();
    expect(calls[0]?.signal.aborted).toBe(true);

    resetMaps();
    resetDraws();
    const failing = await mountShapeInput(() =>
      h(PolygonInput, {
        source: "shape",
        label: "Area",
        refine: async () => {
          throw new Error("boom");
        },
      }),
    );
    await drawWith(
      failing.wrapper,
      failing.draw,
      "Draw a polygon",
      "polygon",
      square(1),
    );
    expect(failing.value()).toEqual(square(1));
  });
});

/** Snaps by shifting every position 1 degree east. */
function fakeRouter(
  snap?: (line: LineString) => LineString | null,
): RoutingProvider & { snapToRoad: ReturnType<typeof vi.fn> } {
  return {
    name: "fake",
    snapToRoad: vi.fn<RoutingProvider["snapToRoad"]>(async (l) =>
      snap
        ? snap(l)
        : {
            type: "LineString",
            coordinates: l.coordinates.map(([x, y]) => [(x ?? 0) + 1, y ?? 0]),
          },
    ),
  };
}

describe("LineStringInput with snapToRoads", () => {
  it("snaps once after a drawn line", async () => {
    const router = fakeRouter();
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(LineStringInput, {
        source: "shape",
        label: "Route",
        snapToRoads: router,
      }),
    );
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(4));

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    expect(router.snapToRoad.mock.calls[0]?.[0]).toEqual(line(4));
    expect(router.snapToRoad.mock.calls[0]?.[1].signal).toBeInstanceOf(
      AbortSignal,
    );
    expect(value()).toEqual({
      type: "LineString",
      coordinates: [
        [5, 4],
        [6, 5],
      ],
    });
    // The write reseeds the draft without counting as a user edit.
    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
  });

  it("leaves a saved line alone on load", async () => {
    const router = fakeRouter();
    const { reset, value } = await mountShapeInput(
      () =>
        h(LineStringInput, {
          source: "shape",
          label: "Route",
          snapToRoads: router,
        }),
      line(2),
    );
    reset(line(7));
    await flushPromises();

    expect(router.snapToRoad).not.toHaveBeenCalled();
    expect(value()).toEqual(line(7));
  });

  it("true takes the router from MapsProvider and throws an error naming snapToRoads when there is none", async () => {
    const router = fakeRouter();
    const { wrapper, draw } = await mountShapeInput(
      () =>
        h(LineStringInput, {
          source: "shape",
          label: "Route",
          snapToRoads: true,
        }),
      null,
      { router },
    );
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(4));
    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    wrapper.unmount();

    const quiet = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      mountShapeInput(() =>
        h(LineStringInput, {
          source: "shape",
          label: "Route",
          snapToRoads: true,
        }),
      ),
    ).rejects.toThrow(/snapToRoads.*MapsProvider/);
    quiet.mockRestore();
  });

  it("keeps the drawn line when the snap fails", async () => {
    const router = fakeRouter(() => null);
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(LineStringInput, {
        source: "shape",
        label: "Route",
        snapToRoads: router,
      }),
    );
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(4));

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    expect(value()).toEqual(line(4));
  });

  it("does not write when the snapped line is identical", async () => {
    const router = fakeRouter((l) => ({
      type: "LineString",
      coordinates: l.coordinates.map(([x, y]) => [x ?? 0, y ?? 0]),
    }));
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(LineStringInput, {
        source: "shape",
        label: "Route",
        snapToRoads: router,
      }),
    );
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(4));
    const written = value();
    await flushPromises();

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
    expect(value()).toBe(written);
  });
});

/** A component that renders `template`, so a bare attribute reaches the wrapper as `""`. */
const fromTemplate = (template: string) =>
  defineComponent({
    components: {
      BBoxInput,
      GeoJsonInput,
      LineStringInput,
      PolygonInput,
    },
    template,
  });

describe("props a wrapper forwards to ShapeInput", () => {
  it("keeps the ShapeInput default for a prop it was not given", async () => {
    const { draw } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape" }),
    );

    expect(draw().modeOf("polygon")?.options.snapping).toEqual({
      toCoordinate: true,
      toLine: true,
    });
    expect(draw().modeOf("polygon")?.options.pointerDistance).toBe(20);
  });

  it("passes a given prop over the ShapeInput default", async () => {
    const { draw } = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", snappable: false, snapDistance: 35 }),
    );

    expect(draw().modeOf("polygon")?.options.snapping).toBeUndefined();
    expect(draw().modeOf("polygon")?.options.pointerDistance).toBe(35);
  });

  it("reads a bare disabled attribute as true", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(fromTemplate('<PolygonInput source="shape" disabled />')),
    );

    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
  });

  it("reads a bare disabled attribute as true on BBoxInput", async () => {
    const { wrapper } = await mountShapeInput(() =>
      h(fromTemplate('<BBoxInput source="shape" disabled />')),
    );

    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
  });

  it("maps a kebab-case attribute onto the camelCase prop", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(fromTemplate('<BBoxInput source="shape" :aspect-ratio="2" />')),
    );

    await drawWith(
      wrapper,
      draw,
      "Draw a rectangle",
      "rectangle",
      rect(0, 0, 4, 4),
    );

    expect(value()).toEqual([-2, 0, 6, 4]);
  });

  it("reads a bare collection attribute as true", async () => {
    const { wrapper, draw, value } = await mountShapeInput(() =>
      h(fromTemplate('<GeoJsonInput source="shape" collection />')),
    );
    await drawWith(wrapper, draw, "Draw a point", "point", point(1));
    await drawWith(wrapper, draw, "Draw a point", "point", point(2));

    expect(value()).toMatchObject({ type: "GeometryCollection" });
  });

  it("reads a bare snap-to-roads attribute as true", async () => {
    const router = fakeRouter();
    const { wrapper, draw } = await mountShapeInput(
      () => h(fromTemplate('<LineStringInput source="shape" snap-to-roads />')),
      null,
      { router },
    );
    await drawWith(wrapper, draw, "Draw a line", "linestring", line(4));

    expect(router.snapToRoad).toHaveBeenCalledTimes(1);
  });
});
