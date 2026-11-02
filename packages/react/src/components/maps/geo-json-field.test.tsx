/**
 * GeoJsonField display tests. jsdom has no WebGL, so `maplibre-gl` is the
 * stand-in in `__fixtures__/fake-maplibre.ts`; the tests mount the field under
 * the providers and assert DOM and what the map was asked to do.
 */

import { fakeDataProvider, rasterTileStyle } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { maps, resetFake } from "./__fixtures__/fake-maplibre";
import { GeoJsonField } from "./geo-json-field";
import { MapsProvider } from "./maps-provider";
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

vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

beforeEach(resetFake);
afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
    >
      <MapsProvider mapStyle={style}>{children}</MapsProvider>
    </CheloneProvider>
  );
}

/** Lets the fake map's microtask `load` fire and React render what follows. */
const loaded = () => act(async () => {});

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

async function show(record: Record<string, unknown>, props = {}) {
  const view = render(
    <GeoJsonField source="geometry" record={record} {...props} />,
    { wrapper },
  );
  await loaded();
  return view;
}

describe("GeoJsonField", () => {
  it("adds one source and fill, line and point layers for a Polygon", async () => {
    const { container } = await show({ geometry: polygon });

    expect(
      container.querySelector('[data-slot="geo-json-field"]'),
    ).not.toBeNull();
    expect(Object.keys(map().sources)).toHaveLength(1);
    const [sourceId] = Object.keys(map().sources);
    expect(map().layers.map((l) => [l.type, l.source])).toEqual([
      ["fill", sourceId],
      ["line", sourceId],
      ["circle", sourceId],
    ]);
  });

  it("wraps a bare geometry and a Feature as a FeatureCollection", async () => {
    await show({ geometry: polygon });
    const feature = { type: "Feature", geometry: polygon, properties: {} };
    const expected = {
      type: "FeatureCollection",
      features: [feature],
    };
    const [sourceId = ""] = Object.keys(map().sources);
    expect(map().sources[sourceId]?.data).toEqual(expected);

    cleanup();
    resetFake();
    await show({ geometry: feature });
    const [featureSourceId = ""] = Object.keys(map().sources);
    expect(map().sources[featureSourceId]?.data).toEqual(expected);
  });

  it("applies shapeStyle to the layer paint", async () => {
    await show(
      { geometry: polygon },
      { shapeStyle: { color: "#ff0000", weight: 6 } },
    );

    const line = map().layers.find((l) => l.type === "line");
    expect(line?.paint).toMatchObject({
      "line-color": "#ff0000",
      "line-width": 6,
    });
  });

  it("fits the bounds with the padding and maxZoom", async () => {
    await show({ geometry: polygon }, { fitPadding: 8, maxFitZoom: 12 });

    expect(map().fits).toEqual([
      {
        bounds: [10, 20, 14, 26],
        options: { padding: 8, maxZoom: 12, duration: 0 },
      },
    ]);
  });

  it("uses the default padding and maxFitZoom", async () => {
    await show({ geometry: polygon });

    expect(map().fits[0]?.options).toEqual({
      padding: 20,
      maxZoom: 18,
      duration: 0,
    });
  });

  it("uses maxFitZoom for a single Point", async () => {
    await show(
      { geometry: { type: "Point", coordinates: [2.35, 48.85] } },
      { maxFitZoom: 15 },
    );

    expect(map().fits).toEqual([
      {
        bounds: [2.35, 48.85, 2.35, 48.85],
        options: { padding: 20, maxZoom: 15, duration: 0 },
      },
    ]);
  });

  it("does not refit on a rerender with the same geometry", async () => {
    const { rerender } = await show({ geometry: polygon });
    rerender(
      <GeoJsonField
        source="geometry"
        record={{ geometry: structuredClone(polygon) }}
        height={200}
      />,
    );
    await loaded();

    expect(map().fits).toHaveLength(1);
    expect(maps).toHaveLength(1);
  });

  it("does not fit when fitBounds is false", async () => {
    await show({ geometry: polygon }, { fitBounds: false });

    expect(map().fits).toEqual([]);
  });

  it("updates the source and refits when the record changes", async () => {
    const { rerender } = await show({ geometry: polygon });
    const moved = {
      type: "Point",
      coordinates: [-3, 40],
    };
    rerender(<GeoJsonField source="geometry" record={{ geometry: moved }} />);
    await loaded();

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
    const { rerender } = await show({ geometry: polygon });
    rerender(
      <GeoJsonField
        source="geometry"
        record={{ geometry: polygon }}
        shapeStyle={{ color: "#00ff00" }}
      />,
    );
    await loaded();

    expect(map().layers).toHaveLength(3);
    expect(map().layers.find((l) => l.type === "line")?.paint).toMatchObject({
      "line-color": "#00ff00",
    });
  });

  it("removes the source and layers on unmount", async () => {
    const { unmount } = await show({ geometry: polygon });
    const target = map();
    unmount();

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
    for (const geometry of [null, "POINT(1 2)", 7, malformed, undefined]) {
      const { container, unmount } = await show({ geometry });
      const empty = container.querySelector(
        '[data-slot="geo-json-field-empty"]',
      );
      expect(empty?.textContent).toBe("No geometry available");
      expect(
        container.querySelector('[data-slot="geo-json-field"]'),
      ).toBeNull();
      expect(maps).toHaveLength(0);
      unmount();
    }
  });

  it("shows a custom emptyText", async () => {
    const { container } = await show(
      { geometry: null },
      { emptyText: "Nothing here" },
    );

    expect(
      container.querySelector('[data-slot="geo-json-field-empty"]')
        ?.textContent,
    ).toBe("Nothing here");
  });

  it("falls back to defaultValue when the property is undefined", async () => {
    await show({}, { defaultValue: polygon });

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

    const expected = await show({ geometry: polygon });
    const reference = {
      html: expected.container.innerHTML.replace(/geo-json-[^"]*/g, ""),
      layers: map().layers.map((l) => l.type),
      fits: map().fits,
    };
    cleanup();

    for (const [name, Field] of Object.entries(aliases)) {
      resetFake();
      const view = render(
        <Field source="geometry" record={{ geometry: polygon }} />,
        { wrapper },
      );
      await loaded();
      expect(
        view.container.innerHTML.replace(/geo-json-[^"]*/g, ""),
        name,
      ).toBe(reference.html);
      expect(
        map().layers.map((l) => l.type),
        name,
      ).toEqual(reference.layers);
      expect(map().fits, name).toEqual(reference.fits);
      view.unmount();
    }
  });
});
