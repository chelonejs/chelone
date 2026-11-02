/**
 * Maps display tests. jsdom has no WebGL, so `maplibre-gl` is the stand-in in
 * `__fixtures__/fake-maplibre.ts`; the tests mount components under the
 * provider and assert DOM and what the map was asked to do.
 */

import {
  createI18n,
  fakeDataProvider,
  mapMessages,
  rasterTileStyle,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { RecordContextProvider } from "../../record/record-context";
import {
  liveMaps,
  liveMarkers,
  maps,
  markers,
  resetFake,
} from "./__fixtures__/fake-maplibre";
import { LatLngField } from "./lat-lng-field";
import { MapCanvas, MapMarker, useMap } from "./map-canvas";
import { MapsProvider } from "./maps-provider";

vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

beforeEach(resetFake);
afterEach(cleanup);

function wrap(messages?: Record<string, string>) {
  const i18n = messages
    ? createI18n({ locale: "en", messages: { en: messages } })
    : undefined;
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

/** Lets the fake map's microtask `load` fire and React render what follows. */
const loaded = () => act(async () => {});

describe("MapCanvas", () => {
  it("creates one map in the container with the style it is given", async () => {
    const { container } = render(<MapCanvas mapStyle={style} />, {
      wrapper: wrap(),
    });
    await loaded();

    expect(maps).toHaveLength(1);
    const slot = container.querySelector('[data-slot="map-canvas"]');
    expect(slot).not.toBeNull();
    expect(maps[0]?.options.container).toBe(slot);
    expect(maps[0]?.options.style).toEqual(style);
  });

  it("passes a style URL through when mapStyle is a string", async () => {
    render(<MapCanvas mapStyle="https://styles.example.test/a.json" />, {
      wrapper: wrap(),
    });
    await loaded();

    expect(maps[0]?.options.style).toBe("https://styles.example.test/a.json");
  });

  it("takes the style from MapsProvider and lets the mapStyle prop win", async () => {
    const fromProvider = rasterTileStyle({
      tileUrl: "https://provider.example.test/{z}/{x}/{y}.png",
      attribution: "Provider",
    });
    render(
      <MapsProvider mapStyle={fromProvider}>
        <MapCanvas />
        <MapCanvas mapStyle="https://styles.example.test/own.json" />
      </MapsProvider>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(maps.map((map) => map.options.style)).toEqual([
      fromProvider,
      "https://styles.example.test/own.json",
    ]);
  });

  it("throws an error naming mapStyle and MapsProvider when neither is set", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<MapCanvas />, { wrapper: wrap() })).toThrowError(
        /mapStyle.*MapsProvider|MapsProvider.*mapStyle/s,
      );
    } finally {
      error.mockRestore();
    }
    expect(maps).toHaveLength(0);
  });

  it("passes center to MapLibre as lng, lat", async () => {
    render(<MapCanvas mapStyle={style} center={[48.85, 2.35]} zoom={9} />, {
      wrapper: wrap(),
    });
    await loaded();

    expect(maps[0]?.options.center).toEqual([2.35, 48.85]);
    expect(maps[0]?.options.zoom).toBe(9);
  });

  it("defaults to the origin at zoom 13 and 300 pixels high", async () => {
    const { container } = render(<MapCanvas mapStyle={style} />, {
      wrapper: wrap(),
    });
    await loaded();

    expect(maps[0]?.options.center).toEqual([0, 0]);
    expect(maps[0]?.options.zoom).toBe(13);
    const slot = container.querySelector<HTMLElement>(
      '[data-slot="map-canvas"]',
    );
    expect(slot?.style.height).toBe("300px");
  });

  it("renders children only after the load event", async () => {
    render(
      <MapCanvas mapStyle={style}>
        <p>child</p>
      </MapCanvas>,
      { wrapper: wrap() },
    );
    expect(screen.queryByText("child")).toBeNull();

    await loaded();
    expect(screen.getByText("child")).toBeTruthy();
  });

  it("removes its map on unmount and keeps one live map under StrictMode", async () => {
    const { unmount } = render(
      <StrictMode>
        <MapCanvas mapStyle={style}>
          <p>child</p>
        </MapCanvas>
      </StrictMode>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(liveMaps()).toHaveLength(1);
    expect(screen.getByText("child")).toBeTruthy();

    unmount();
    expect(liveMaps()).toHaveLength(0);
  });

  it("turns scroll zoom off when scrollZoom is false", async () => {
    render(
      <>
        <MapCanvas mapStyle={style} scrollZoom={false} />
        <MapCanvas mapStyle={style} />
      </>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(maps[0]?.options.scrollZoom).toBe(false);
    expect(maps[1]?.options.scrollZoom).toBe(true);
  });

  it("passes className to the container", async () => {
    const { container } = render(
      <MapCanvas mapStyle={style} className="rounded-md" />,
      { wrapper: wrap() },
    );
    await loaded();

    expect(
      container
        .querySelector('[data-slot="map-canvas"]')
        ?.classList.contains("rounded-md"),
    ).toBe(true);
  });
});

describe("useMap", () => {
  it("throws outside a MapCanvas", () => {
    function Probe() {
      useMap();
      return null;
    }
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<Probe />, { wrapper: wrap() })).toThrowError(
        /MapCanvas/,
      );
    } finally {
      error.mockRestore();
    }
  });

  it("returns the map to the children", async () => {
    let seen: unknown;
    function Probe() {
      seen = useMap();
      return null;
    }
    render(
      <MapCanvas mapStyle={style}>
        <Probe />
      </MapCanvas>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(seen).toBe(maps[0]);
  });
});

describe("MapMarker", () => {
  it("places a marker at lng, lat and moves it when position changes", async () => {
    const { rerender } = render(
      <MapCanvas mapStyle={style}>
        <MapMarker position={[48.85, 2.35]} />
      </MapCanvas>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(markers).toHaveLength(1);
    expect(markers[0]?.map).toBe(maps[0]);
    expect(markers[0]?.lngLats.at(-1)).toEqual([2.35, 48.85]);
    expect(markers[0]?.options.anchor).toBe("bottom");
    expect(markers[0]?.getElement().querySelector("svg")).not.toBeNull();

    rerender(
      <MapCanvas mapStyle={style}>
        <MapMarker position={[40.7, -74]} />
      </MapCanvas>,
    );
    expect(markers).toHaveLength(1);
    expect(markers[0]?.lngLats.at(-1)).toEqual([-74, 40.7]);
  });

  it("removes the marker on unmount", async () => {
    const { rerender } = render(
      <MapCanvas mapStyle={style}>
        <MapMarker position={[1, 2]} />
      </MapCanvas>,
      { wrapper: wrap() },
    );
    await loaded();
    expect(liveMarkers()).toHaveLength(1);

    rerender(<MapCanvas mapStyle={style} />);
    expect(liveMarkers()).toHaveLength(0);
  });

  it("makes the marker draggable on request", async () => {
    render(
      <MapCanvas mapStyle={style}>
        <MapMarker position={[1, 2]} draggable />
      </MapCanvas>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(markers[0]?.draggable).toBe(true);
  });

  it("calls the latest onDragEnd with lat and lng", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <MapCanvas mapStyle={style}>
        <MapMarker position={[1, 2]} draggable onDragEnd={first} />
      </MapCanvas>,
      { wrapper: wrap() },
    );
    await loaded();

    rerender(
      <MapCanvas mapStyle={style}>
        <MapMarker position={[1, 2]} draggable onDragEnd={second} />
      </MapCanvas>,
    );
    expect(markers).toHaveLength(1);

    markers[0]?.dragTo(2.35, 48.85);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(48.85, 2.35);
  });
});

describe("LatLngField", () => {
  const field = (props: Partial<Parameters<typeof LatLngField>[0]> = {}) => (
    <LatLngField
      latSource="lat"
      lngSource="lng"
      mapStyle={style}
      record={{ lat: 48.85, lng: 2.35 }}
      {...props}
    />
  );

  it("marks the record's coordinates", async () => {
    const { container } = render(field(), { wrapper: wrap() });
    await loaded();

    expect(
      container.querySelector('[data-slot="lat-lng-field"]'),
    ).not.toBeNull();
    expect(maps).toHaveLength(1);
    expect(maps[0]?.options.center).toEqual([2.35, 48.85]);
    expect(maps[0]?.options.scrollZoom).toBe(false);
    expect(liveMarkers()).toHaveLength(1);
    expect(markers[0]?.lngLats.at(-1)).toEqual([2.35, 48.85]);
  });

  it("reads numeric strings, as a backend may send them", async () => {
    render(field({ record: { lat: "48.85", lng: "2.35" } }), {
      wrapper: wrap(),
    });
    await loaded();

    expect(markers[0]?.lngLats.at(-1)).toEqual([2.35, 48.85]);
  });

  it("treats 0, 0 as a position", async () => {
    render(field({ record: { lat: 0, lng: 0 } }), { wrapper: wrap() });
    await loaded();

    expect(
      document.querySelector('[data-slot="lat-lng-field-empty"]'),
    ).toBeNull();
    expect(markers[0]?.lngLats.at(-1)).toEqual([0, 0]);
  });

  it("follows the record when its coordinates change", async () => {
    const { rerender } = render(field(), { wrapper: wrap() });
    await loaded();

    rerender(field({ record: { lat: 40.7, lng: -74 } }));
    await loaded();

    expect(liveMaps()).toHaveLength(1);
    expect(maps.at(-1)?.options.center).toEqual([-74, 40.7]);
    expect(liveMarkers()).toHaveLength(1);
  });

  it.each([
    ["null", { lat: null, lng: 2.35 }],
    ["undefined", { lat: 48.85 }],
    ["NaN", { lat: Number.NaN, lng: 2.35 }],
    ["text", { lat: "north", lng: 2.35 }],
  ])("shows the translated empty text for %s", (_label, record) => {
    const { container } = render(field({ record }), {
      wrapper: wrap(mapMessages as unknown as Record<string, string>),
    });

    const empty = container.querySelector('[data-slot="lat-lng-field-empty"]');
    expect(empty?.textContent).toBe("No coordinates");
    expect(maps).toHaveLength(0);
  });

  it("falls back to the default text when no catalog has the key", () => {
    const { container } = render(field({ record: { lat: null, lng: null } }), {
      wrapper: wrap(),
    });

    expect(
      container.querySelector('[data-slot="lat-lng-field-empty"]')?.textContent,
    ).toBe("No coordinates available");
  });

  it("prefers a record prop over the ambient record", async () => {
    render(
      <RecordContextProvider value={{ lat: 10, lng: 20 }}>
        {field({ record: { lat: 1, lng: 2 } })}
        {field({ record: undefined })}
      </RecordContextProvider>,
      { wrapper: wrap() },
    );
    await loaded();

    expect(maps.map((map) => map.options.center)).toEqual([
      [2, 1],
      [20, 10],
    ]);
  });
});
