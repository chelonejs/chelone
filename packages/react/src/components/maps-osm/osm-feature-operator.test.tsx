/**
 * OsmFeatureOperator tests. `./osm-features` is mocked, so no test calls the
 * network; the geometry maths (`subtractMask`, `unionAll`) is the real one.
 */

import {
  createI18n,
  createNotificationStore,
  fakeDataProvider,
  type JsonObject,
  type MessageCatalog,
  mapMessages,
  type NotificationStore,
  type OverpassProvider,
  OverpassRateLimitError,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { CheloneFormProvider } from "../../form-context";
import { useForm } from "../../form-hooks";
import { MapsProvider } from "../maps/maps-provider";
import { OsmFeatureAdd, OsmFeatureSubtract } from "./osm-feature-operator";
import { fetchOsmFeatures } from "./osm-features";

vi.mock("./osm-features", () => ({ fetchOsmFeatures: vi.fn() }));

const fetchMock = vi.mocked(fetchOsmFeatures);

beforeEach(() => {
  fetchMock.mockReset();
});
afterEach(cleanup);

const rect = (
  west: number,
  south: number,
  east: number,
  north: number,
): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ],
});

/** About 1.24 km², at the equator. */
const field = rect(0, 0, 0.01, 0.01);
const feature = (
  geometry: Polygon,
): Feature<Geometry | null, JsonObject | null> => ({
  type: "Feature",
  properties: {},
  geometry,
});
const collection = (...geometries: Polygon[]) => ({
  type: "FeatureCollection" as const,
  features: geometries.map(feature),
});
/** Covers the right half of `field`. */
const rightHalf = rect(0.005, -1, 1, 1);
/** Covers all of `field`. */
const cover = rect(-1, -1, 1, 1);
/** Sits beside `field`, to its east. */
const neighbour = rect(0.01, 0, 0.02, 0.01);

/** A strip across the middle of `field`; subtracting it leaves two pieces. */
const stripe = rect(0.004, -1, 0.006, 1);
/** Sits clear of `field`, to its east. */
const apart = rect(0.02, 0, 0.03, 0.01);
const multi = (...polygons: Polygon[]): MultiPolygon => ({
  type: "MultiPolygon",
  coordinates: polygons.map((p) => p.coordinates),
});

const overpass: OverpassProvider = {
  name: "fake",
  query: async () => ({ elements: [] }),
};

const catalog: MessageCatalog = {
  ...mapMessages,
  "chelone.map.osm.subtracted": "Subtracted {area}",
};

interface Mounted {
  notifications: NotificationStore;
  value: () => unknown;
  dirty: () => boolean;
  /** Sets the field from outside the operator, as another input on the form would. */
  set: (value: unknown) => Promise<void>;
}

function mount(
  operator: ReactElement,
  initial: unknown = field,
  maps: { overpass?: OverpassProvider } = { overpass },
): Mounted {
  const notifications = createNotificationStore();
  const state = { value: initial as unknown, dirty: false };
  let setField: (value: unknown) => void = () => {};
  function Host() {
    const form = useForm<{ area: unknown }>({
      defaultValues: { area: initial },
      save: async () => undefined,
    });
    state.value = useSelector(form.form.store, (s) => s.values.area);
    setField = (value) => form.form.setFieldValue("area", value);
    state.dirty = useSelector(
      form.form.store,
      (s) => s.fieldMeta.area?.isDirty ?? false,
    );
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {operator}
      </CheloneFormProvider>
    );
  }
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({ locale: "en", messages: { en: catalog } })}
      notifications={notifications}
    >
      <MapsProvider overpass={maps.overpass}>
        <Host />
      </MapsProvider>
    </CheloneProvider>,
  );
  return {
    notifications,
    value: () => state.value,
    dirty: () => state.dirty,
    set: (value) => act(async () => setField(value)),
  };
}

const click = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
  });
};

const messages = (n: NotificationStore) =>
  n.getSnapshot().map(({ message, type, messageArgs }) => ({
    message,
    type,
    messageArgs,
  }));

describe("OsmFeatureSubtract", () => {
  it("warns and sends no request when there are no presets or tags", async () => {
    const m = mount(<OsmFeatureSubtract source="area" />);
    await click();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.no_sources",
        type: "warning",
        messageArgs: undefined,
      },
    ]);
  });

  it("warns and sends no request when the polygon is empty", async () => {
    const empty = mount(
      <OsmFeatureSubtract source="area" presets={["water"]} />,
      null,
    );
    await click();
    expect(messages(empty.notifications).map((n) => n.message)).toEqual([
      "chelone.map.osm.no_polygon",
    ]);
    cleanup();

    const point = mount(
      <OsmFeatureSubtract source="area" presets={["water"]} />,
      { type: "Point", coordinates: [0, 0] },
    );
    await click();
    expect(messages(point.notifications)[0]).toMatchObject({
      message: "chelone.map.osm.no_polygon",
      type: "warning",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches with the polygon's bounds and writes the reduced polygon with the area notice", async () => {
    fetchMock.mockResolvedValue(collection(rightHalf));
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, bbox, sources, options] = fetchMock.mock.calls[0] ?? [];
    expect(bbox).toEqual([0, 0, 0.01, 0.01]);
    expect(sources).toEqual({ presets: ["water"], tags: undefined });
    expect(options?.provider).toBe(overpass);

    expect(m.value()).toEqual(rect(0, 0, 0.005, 0.01));
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.subtracted",
        type: "success",
        messageArgs: { area: "0.620 km²" },
      },
    ]);
  });

  it("tells the user when nothing matches and leaves the polygon alone", async () => {
    fetchMock.mockResolvedValue(collection());
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();

    expect(m.value()).toEqual(field);
    expect(m.dirty()).toBe(false);
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.no_match",
        type: "info",
        messageArgs: undefined,
      },
    ]);
  });

  it("clears the value and warns when the polygon is entirely covered", async () => {
    fetchMock.mockResolvedValue(collection(cover));
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();

    expect(m.value()).toBeNull();
    expect(messages(m.notifications).map((n) => [n.message, n.type])).toEqual([
      ["chelone.map.osm.covered", "warning"],
    ]);
  });

  it("shows the rate limit message for a 429 and the error message for another failure", async () => {
    fetchMock.mockRejectedValueOnce(new OverpassRateLimitError());
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    await click();

    expect(messages(m.notifications).map((n) => [n.message, n.type])).toEqual([
      ["chelone.map.osm.rate_limited", "error"],
      ["chelone.map.osm.error", "error"],
    ]);
    expect(m.value()).toEqual(field);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("disables the button with a spinner while the request runs", async () => {
    let finish: (value: ReturnType<typeof collection>) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(screen.queryByRole("status")).toBeNull();

    await click();
    expect(button.disabled).toBe(true);
    expect(screen.getByRole("status")).toBeTruthy();

    await act(async () => finish(collection()));
    expect(button.disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("takes the provider from MapsProvider and throws an error naming provider and MapsProvider when neither is set", async () => {
    const other: OverpassProvider = {
      name: "other",
      query: async () => ({ elements: [] }),
    };
    const providerOfLastCall = () => fetchMock.mock.lastCall?.[3].provider;
    fetchMock.mockResolvedValue(collection());

    mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();
    expect(providerOfLastCall()).toBe(overpass);
    cleanup();

    // The prop wins over MapsProvider.
    mount(
      <OsmFeatureSubtract source="area" presets={["water"]} provider={other} />,
    );
    await click();
    expect(providerOfLastCall()).toBe(other);
    cleanup();

    // The prop alone is enough.
    mount(
      <OsmFeatureSubtract source="area" presets={["water"]} provider={other} />,
      field,
      {},
    );
    await click();
    expect(providerOfLastCall()).toBe(other);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    cleanup();

    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      mount(
        <OsmFeatureSubtract source="area" presets={["water"]} />,
        field,
        {},
      ),
    ).toThrow(/`provider`.*MapsProvider/);
    quiet.mockRestore();
  });

  it("aborts the request on unmount and writes nothing", async () => {
    let signal: AbortSignal | undefined;
    let finish: (value: ReturnType<typeof collection>) => void = () => {};
    fetchMock.mockImplementation((_client, _bbox, _sources, options) => {
      signal = options.signal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();
    expect(signal?.aborted).toBe(false);

    cleanup();
    expect(signal?.aborted).toBe(true);
    await act(async () => finish(collection(rightHalf)));
    expect(m.value()).toEqual(field);
    expect(m.notifications.getSnapshot()).toEqual([]);
  });

  it("writes nothing when the polygon changed while the request ran", async () => {
    let finish: (value: ReturnType<typeof collection>) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();
    const redrawn = rect(5, 5, 6, 6);
    await m.set(redrawn);
    await act(async () => finish(collection(rightHalf)));

    expect(m.value()).toEqual(redrawn);
    expect(m.notifications.getSnapshot()).toEqual([]);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("ignores an AbortError", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();
    expect(m.notifications.getSnapshot()).toEqual([]);
  });

  it("marks the form dirty after a write", async () => {
    fetchMock.mockResolvedValue(collection(rightHalf));
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    expect(m.dirty()).toBe(false);
    await click();
    await waitFor(() => expect(m.dirty()).toBe(true));
  });

  it("writes nothing and warns when the result would split a Polygon", async () => {
    fetchMock.mockResolvedValue(collection(stripe));
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();

    expect(m.value()).toEqual(field);
    expect(m.dirty()).toBe(false);
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.would_split",
        type: "warning",
        messageArgs: undefined,
      },
    ]);
  });

  it("writes a one-part result to a Polygon field as a Polygon", async () => {
    fetchMock.mockResolvedValue(collection(rightHalf));
    const m = mount(<OsmFeatureSubtract source="area" presets={["water"]} />);
    await click();

    expect(m.value()).toEqual(rect(0, 0, 0.005, 0.01));
  });

  it("writes a split result to a MultiPolygon field as a MultiPolygon", async () => {
    fetchMock.mockResolvedValue(collection(stripe));
    const m = mount(
      <OsmFeatureSubtract source="area" presets={["water"]} />,
      multi(field),
    );
    await click();

    const written = m.value() as MultiPolygon;
    expect(written.type).toBe("MultiPolygon");
    expect(written.coordinates).toHaveLength(2);
    expect(messages(m.notifications)[0]).toMatchObject({
      message: "chelone.map.osm.subtracted",
      type: "success",
    });
  });

  it("writes a Polygon result to a MultiPolygon field as a one-part MultiPolygon", async () => {
    fetchMock.mockResolvedValue(collection(rightHalf));
    const m = mount(
      <OsmFeatureSubtract source="area" presets={["water"]} />,
      multi(field),
    );
    await click();

    expect(m.value()).toEqual(multi(rect(0, 0, 0.005, 0.01)));
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.subtracted",
        type: "success",
        messageArgs: { area: "0.620 km²" },
      },
    ]);
  });
});

describe("OsmFeatureAdd", () => {
  it("writes the union and the added area", async () => {
    fetchMock.mockResolvedValue(collection(neighbour));
    const m = mount(<OsmFeatureAdd source="area" presets={["buildings"]} />);
    expect(screen.getByRole("button").textContent).toBe(
      "Add OpenStreetMap areas",
    );
    await click();

    expect(m.value()).toEqual(rect(0, 0, 0.02, 0.01));
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.added",
        type: "success",
        messageArgs: { area: "1.239 km²" },
      },
    ]);
  });

  it("tells the user when nothing matches", async () => {
    fetchMock.mockResolvedValue(collection());
    const m = mount(<OsmFeatureAdd source="area" presets={["buildings"]} />);
    await click();

    expect(m.value()).toEqual(field);
    expect(messages(m.notifications).map((n) => [n.message, n.type])).toEqual([
      ["chelone.map.osm.no_match", "info"],
    ]);
  });

  it("writes nothing and warns when the union of a Polygon has separate pieces", async () => {
    fetchMock.mockResolvedValue(collection(apart));
    const m = mount(<OsmFeatureAdd source="area" presets={["buildings"]} />);
    await click();

    expect(m.value()).toEqual(field);
    expect(m.dirty()).toBe(false);
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.would_split",
        type: "warning",
        messageArgs: undefined,
      },
    ]);
  });

  it("writes a Polygon result to a MultiPolygon field as a one-part MultiPolygon", async () => {
    fetchMock.mockResolvedValue(collection(neighbour));
    const m = mount(
      <OsmFeatureAdd source="area" presets={["buildings"]} />,
      multi(field),
    );
    await click();

    expect(m.value()).toEqual(multi(rect(0, 0, 0.02, 0.01)));
    expect(messages(m.notifications)).toEqual([
      {
        message: "chelone.map.osm.added",
        type: "success",
        messageArgs: { area: "1.239 km²" },
      },
    ]);
  });
});
