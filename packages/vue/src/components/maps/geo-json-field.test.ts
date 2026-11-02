/**
 * GeoJsonField, the named shape fields and BBoxField display tests. jsdom has
 * no WebGL, so `maplibre-gl` is the stand-in in `__fixtures__/fake-maplibre.ts`;
 * the tests mount the field under the providers and assert DOM and what the
 * map was asked to do.
 */

import { fakeDataProvider, rasterTileStyle } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, reactive } from "vue";
import { provideCheloneContext } from "../../context";
import { maps, resetFake } from "./__fixtures__/fake-maplibre";
import BBoxField from "./bbox-field.vue";
import GeoJsonField from "./geo-json-field.vue";
import * as shapeFields from "./shape-fields";
import {
  FeatureCollectionField,
  FeatureField,
  GeometryCollectionField,
  LineStringField,
  MultiLineStringField,
  MultiPointField,
  MultiPolygonField,
  PointField,
  PolygonField,
} from "./shape-fields";
import { MapsProvider } from "./use-map";

vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

const mounted: { unmount(): void }[] = [];

beforeEach(resetFake);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [10, 20],
      [14, 20],
      [14, 26],
      [10, 26],
      [10, 20],
    ],
  ],
};

const map = () => {
  const [first] = maps;
  if (!first) throw new Error("no map was built");
  return first;
};

/**
 * Mounts `Field` under the providers. The returned `props` are reactive: set
 * one and await `flushPromises()` to re-render with it.
 */
async function show(
  Field: Component,
  initial: Record<string, unknown>,
  source = "geometry",
) {
  const props = reactive<Record<string, unknown>>({ ...initial });
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
      });
      return () =>
        h(MapsProvider, { mapStyle: style }, () =>
          h(Field, { source, ...props }),
        );
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  // Lets the fake map's microtask `load` fire and Vue render what follows.
  await flushPromises();
  return { wrapper, props };
}

describe("GeoJsonField", () => {
  it("adds one source and fill, line and point layers for a Polygon", async () => {
    const { wrapper } = await show(GeoJsonField, {
      record: { geometry: polygon },
    });

    expect(wrapper.find('[data-slot="geo-json-field"]').exists()).toBe(true);
    expect(Object.keys(map().sources)).toHaveLength(1);
    const [sourceId] = Object.keys(map().sources);
    expect(map().layers.map((l) => [l.type, l.source])).toEqual([
      ["fill", sourceId],
      ["line", sourceId],
      ["circle", sourceId],
    ]);
  });

  it("wraps a bare geometry and a Feature as a FeatureCollection", async () => {
    await show(GeoJsonField, { record: { geometry: polygon } });
    const feature = { type: "Feature", geometry: polygon, properties: {} };
    const expected = { type: "FeatureCollection", features: [feature] };
    const [sourceId = ""] = Object.keys(map().sources);
    expect(map().sources[sourceId]?.data).toEqual(expected);

    for (const wrapper of mounted.splice(0)) wrapper.unmount();
    resetFake();
    await show(GeoJsonField, { record: { geometry: feature } });
    const [featureSourceId = ""] = Object.keys(map().sources);
    expect(map().sources[featureSourceId]?.data).toEqual(expected);
  });

  it("applies shapeStyle to the layer paint", async () => {
    await show(GeoJsonField, {
      record: { geometry: polygon },
      shapeStyle: { color: "#ff0000", weight: 6 },
    });

    const line = map().layers.find((l) => l.type === "line");
    expect(line?.paint).toMatchObject({
      "line-color": "#ff0000",
      "line-width": 6,
    });
  });

  it("fits the bounds with the padding and maxZoom", async () => {
    await show(GeoJsonField, {
      record: { geometry: polygon },
      fitPadding: 8,
      maxFitZoom: 12,
    });

    expect(map().fits).toEqual([
      {
        bounds: [10, 20, 14, 26],
        options: { padding: 8, maxZoom: 12, duration: 0 },
      },
    ]);
  });

  it("uses the default padding and maxFitZoom", async () => {
    await show(GeoJsonField, { record: { geometry: polygon } });

    expect(map().fits[0]?.options).toEqual({
      padding: 20,
      maxZoom: 18,
      duration: 0,
    });
  });

  it("uses maxFitZoom for a single Point", async () => {
    await show(GeoJsonField, {
      record: { geometry: { type: "Point", coordinates: [2.35, 48.85] } },
      maxFitZoom: 15,
    });

    expect(map().fits).toEqual([
      {
        bounds: [2.35, 48.85, 2.35, 48.85],
        options: { padding: 20, maxZoom: 15, duration: 0 },
      },
    ]);
  });

  it("does not refit on an update with the same geometry", async () => {
    const { props } = await show(GeoJsonField, {
      record: { geometry: polygon },
    });
    props.record = { geometry: structuredClone(polygon) };
    props.height = 200;
    await flushPromises();

    expect(map().fits).toHaveLength(1);
    expect(maps).toHaveLength(1);
  });

  it("does not fit when fitBounds is false", async () => {
    await show(GeoJsonField, {
      record: { geometry: polygon },
      fitBounds: false,
    });

    expect(map().fits).toEqual([]);
  });

  it("updates the source and refits when the record changes", async () => {
    const { props } = await show(GeoJsonField, {
      record: { geometry: polygon },
    });
    const moved = { type: "Point", coordinates: [-3, 40] };
    props.record = { geometry: moved };
    await flushPromises();

    expect(maps).toHaveLength(1);
    expect(Object.keys(map().sources)).toHaveLength(1);
    const [sourceId = ""] = Object.keys(map().sources);
    expect(map().sources[sourceId]?.dataCalls).toEqual([
      {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: moved, properties: {} }],
      },
    ]);
    expect(map().fits.at(-1)?.bounds).toEqual([-3, 40, -3, 40]);
    expect(map().fits).toHaveLength(2);
  });

  it("replaces the layers when shapeStyle changes", async () => {
    const { props } = await show(GeoJsonField, {
      record: { geometry: polygon },
    });
    props.shapeStyle = { color: "#00ff00" };
    await flushPromises();

    expect(map().layers).toHaveLength(3);
    expect(map().layers.find((l) => l.type === "line")?.paint).toMatchObject({
      "line-color": "#00ff00",
    });
  });

  it("removes the source and layers on unmount", async () => {
    const { wrapper } = await show(GeoJsonField, {
      record: { geometry: polygon },
    });
    const target = map();
    wrapper.unmount();

    expect(target.layers).toEqual([]);
    expect(target.sources).toEqual({});
  });

  it("shows the empty state for null, a string and a malformed Polygon without throwing", async () => {
    const malformed = {
      type: "Polygon",
      // One level of nesting short: a ring where rings of rings belong.
      coordinates: [
        [10, 20],
        [14, 20],
        [14, 26],
      ],
    };
    const outOfRange = [
      { type: "Point", coordinates: [10, 95] },
      // Projected metres, not degrees.
      { type: "Point", coordinates: [261845, 6250566] },
    ];
    for (const geometry of [
      null,
      "POINT(1 2)",
      7,
      malformed,
      undefined,
      ...outOfRange,
    ]) {
      const { wrapper } = await show(GeoJsonField, { record: { geometry } });
      expect(wrapper.find('[data-slot="geo-json-field-empty"]').text()).toBe(
        "No geometry available",
      );
      expect(wrapper.find('[data-slot="geo-json-field"]').exists()).toBe(false);
      expect(maps).toHaveLength(0);
      wrapper.unmount();
    }
  });

  it("shows a custom emptyText", async () => {
    const { wrapper } = await show(GeoJsonField, {
      record: { geometry: null },
      emptyText: "Nothing here",
    });

    expect(wrapper.find('[data-slot="geo-json-field-empty"]').text()).toBe(
      "Nothing here",
    );
  });

  it("falls back to defaultValue when the property is undefined", async () => {
    await show(GeoJsonField, { record: {}, defaultValue: polygon });

    expect(map().fits).toHaveLength(1);
  });
});

describe("the named shape fields", () => {
  it("every named alias renders the same map as GeoJsonField", async () => {
    const aliases = {
      PointField,
      MultiPointField,
      LineStringField,
      MultiLineStringField,
      PolygonField,
      MultiPolygonField,
      GeometryCollectionField,
      FeatureField,
      FeatureCollectionField,
    };
    // Guards the list above: a new alias must be added to it.
    expect(Object.keys(shapeFields).sort()).toEqual(
      Object.keys(aliases).sort(),
    );

    const record = { geometry: polygon };
    const expected = await show(GeoJsonField, { record });
    const reference = {
      html: expected.wrapper.html(),
      layers: map().layers.map((l) => l.type),
      fits: map().fits,
    };
    expected.wrapper.unmount();

    for (const [name, Field] of Object.entries(aliases)) {
      resetFake();
      const view = await show(Field, { record });
      expect(view.wrapper.html(), name).toBe(reference.html);
      expect(
        map().layers.map((l) => l.type),
        name,
      ).toEqual(reference.layers);
      expect(map().fits, name).toEqual(reference.fits);
      view.wrapper.unmount();
    }
  });
});

describe("BBoxField", () => {
  it("draws the box as a closed polygon and fits it", async () => {
    await show(BBoxField, { record: { bbox: [10, 20, 14, 26] } }, "bbox");

    const [sourceId = ""] = Object.keys(map().sources);
    expect(map().sources[sourceId]?.data).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [10, 20],
                [14, 20],
                [14, 26],
                [10, 26],
                [10, 20],
              ],
            ],
          },
        },
      ],
    });
    expect(map().fits[0]?.bounds).toEqual([10, 20, 14, 26]);
  });

  it("shows the empty state for a three-element array and null", async () => {
    for (const bbox of [[10, 20, 14], null, [0, 0, 10, 95]]) {
      const { wrapper } = await show(BBoxField, { record: { bbox } }, "bbox");
      expect(wrapper.find('[data-slot="geo-json-field-empty"]').text()).toBe(
        "No geometry available",
      );
      expect(maps).toHaveLength(0);
      wrapper.unmount();
    }
  });
});
