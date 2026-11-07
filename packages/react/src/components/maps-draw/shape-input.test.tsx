/**
 * ShapeInput tests. jsdom has no WebGL and sends no pointer events, so
 * `maplibre-gl` and `terra-draw` are the stand-ins in the `__fixtures__`
 * folders. A test mounts the input in a form under the maps provider, then
 * plays Terra Draw's part on the fake instance (a stored feature changes, then
 * `finish` fires) and asserts the form's value, the DOM and what the instance
 * was asked to do.
 */

import {
  createI18n,
  createNotificationStore,
  fakeDataProvider,
  isGeoFeatureCollection,
  mapMessages,
  rasterTileStyle,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { CheloneFormProvider } from "../../form-context";
import { useForm } from "../../form-hooks";
import {
  maps,
  resetFake as resetMaps,
} from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/maps-provider";
import {
  draws,
  type FakeFeature,
  refuseFeatures,
  resetFake as resetDraws,
} from "./__fixtures__/fake-terra-draw";
import {
  mountShapeInput,
  storedValue,
  toolbarNames,
} from "./__fixtures__/mount-shape-input";
import { ShapeInput, type ShapeInputProps } from "./shape-input";
import {
  LineStringInput,
  MultiPolygonInput,
  PointInput,
  PolygonInput,
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

beforeEach(() => {
  resetMaps();
  resetDraws();
});
afterEach(cleanup);

type Geometry = { type: string; coordinates?: unknown };
type Values = { shape: unknown };

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

function ValueProbe({
  form,
}: {
  form: ReturnType<typeof useForm<Values>>["form"];
}) {
  const value = useSelector(form.store, (state) => state.values.shape);
  return <output data-testid="value">{JSON.stringify(value)}</output>;
}

async function setup(
  props: Partial<ShapeInputProps> = {},
  shape: unknown = square(),
  {
    ready = true,
    messages = mapMessages,
  }: { ready?: boolean; messages?: Record<string, string> } = {},
) {
  let current: ReturnType<typeof useForm<Values>> | undefined;
  function FormHost() {
    const form = useForm<Values>({
      defaultValues: { shape },
      save: async () => undefined,
    });
    current = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <ShapeInput source="shape" kind="Polygon" label="Area" {...props} />
        <ValueProbe form={form.form} />
        <output data-testid="dirty">{`${form.isDirty}`}</output>
      </CheloneFormProvider>
    );
  }
  const view = render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({ locale: "en", messages: { en: messages } })}
    >
      <MapsProvider mapStyle={style}>
        <FormHost />
      </MapsProvider>
    </CheloneProvider>,
  );
  // Lets the fake map's microtask `load` fire and React render what follows.
  await act(async () => {});
  const draw = () => {
    const instance = draws[draws.length - 1];
    if (!instance) throw new Error("no draw instance");
    return instance;
  };
  if (ready) await act(async () => draw().emitReady());
  const form = () => {
    if (!current) throw new Error("form not mounted");
    return current;
  };
  return {
    view,
    draw,
    form,
    map: () => {
      const map = maps[0];
      if (!map) throw new Error("no map");
      return map;
    },
  };
}

const value = () =>
  JSON.parse(screen.getByTestId("value").textContent ?? "null");
const dirty = () => screen.getByTestId("dirty").textContent;
const button = (name: string) =>
  elementOf(screen.getByRole("button", { name }), HTMLButtonElement);

/** The id of the user's feature in the fake store. */
const storedId = (features: FakeFeature[]) => {
  const id = features.find((f) => f.id !== undefined)?.id;
  if (id === undefined) throw new Error("no stored feature");
  return id;
};

describe("ShapeInput", () => {
  it("hydrates the draft from the field value and adds the features to the draw instance", async () => {
    const { draw, view } = await setup();

    expect(draw().added).toHaveLength(1);
    const added = draw().added[0] ?? [];
    expect(added).toHaveLength(1);
    expect(added[0]?.geometry).toEqual(square());
    expect(added[0]?.properties.mode).toBe("polygon");
    expect(screen.getByText("Area")).toBeTruthy();
    expect(
      view.container.querySelector('[data-slot="shape-input"]'),
    ).not.toBeNull();
  });

  it("starts the draw instance after the map loads and stops it on unmount", async () => {
    const { draw, map, view } = await setup({}, square(), { ready: false });

    expect(draws).toHaveLength(1);
    expect(draw().starts).toBe(1);
    expect(draw().adapter.map).toBe(map());
    // The features wait for the instance's `ready` event.
    expect(draw().added).toEqual([]);
    expect(draw().modeCalls).toEqual([]);

    await act(async () => draw().emitReady());
    expect(draw().added).toHaveLength(1);
    expect(draw().mode).toBe("render");

    view.unmount();
    expect(draw().stops).toBe(1);
  });

  it("commits the form on a finished drawing and clears the tool", async () => {
    const { draw } = await setup({}, null);

    fireEvent.click(button("Draw a polygon"));
    expect(button("Draw a polygon").getAttribute("aria-pressed")).toBe("true");
    expect(draw().mode).toBe("polygon");

    let id: string | number = "";
    await act(async () => {
      id = draw().put(square(5), "polygon");
      draw().emitFinish(id, "draw");
    });

    expect(value()).toEqual(square(5));
    expect(button("Draw a polygon").getAttribute("aria-pressed")).toBe("false");
    expect(draw().mode).toBe("render");
  });

  it("commits on a finished vertex drag", async () => {
    const { draw } = await setup();
    fireEvent.click(button("Edit"));
    expect(draw().mode).toBe("select");

    await act(async () => {
      const id = storedId(draw().features);
      draw().replace(id, square(2));
      draw().emitFinish(id, "dragCoordinate", "select");
    });

    expect(value()).toEqual(square(2));
  });

  it("writes nothing for changes outside a finish or a delete", async () => {
    const { draw } = await setup();
    fireEvent.click(button("Edit"));
    const id = storedId(draw().features);

    await act(async () => {
      draw().replace(id, square(3));
      draw().emitChange([id], "update", { target: "geometry" });
      draw().emitChange([id], "create");
      draw().emitSelect(id);
      draw().emitDeselect(id);
    });

    expect(value()).toEqual(square());
    expect(dirty()).toBe("false");
  });

  it("commits on a removed feature and stores null when no feature is left", async () => {
    const { draw } = await setup();
    fireEvent.click(button("Edit"));

    await act(async () => {
      draw().deleteFromStore(storedId(draw().features));
    });

    expect(value()).toBeNull();
  });

  it("commits once for a drawing that deletes its closing point before it finishes", async () => {
    const onCommit = vi.fn();
    const { draw } = await setup({ onCommit }, null);
    fireEvent.click(button("Draw a polygon"));

    await act(async () => {
      // Terra Draw ends a polygon by removing its closing and snapping points
      // after the new feature has left `currentlyDrawing`, then fires `finish`.
      const closing = draw().put(
        { type: "Point", coordinates: [5, 5] },
        "polygon",
      );
      draw().setProperty(closing, "closingPoint", true);
      const id = draw().put(square(5), "polygon");
      draw().emitChange([closing], "delete");
      draw().emitFinish(id, "draw");
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(value()).toEqual(square(5));
  });

  it("commits once for a snapped vertex drag", async () => {
    const onCommit = vi.fn();
    const { draw } = await setup({ onCommit });
    fireEvent.click(button("Edit"));

    await act(async () => {
      const id = storedId(draw().features);
      const snapping = draw().put(
        { type: "Point", coordinates: [1, 1] },
        "polygon",
      );
      draw().setProperty(snapping, "snappingPoint", true);
      draw().replace(id, square(2));
      draw().emitChange([snapping], "delete");
      draw().emitFinish(id, "dragCoordinate", "select");
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(value()).toEqual(square(2));
  });

  it("ignores the changes of its own sync", async () => {
    const onCommit = vi.fn();
    const { draw, form } = await setup({ onCommit });

    const before = draw().clears;

    await act(async () => form().form.reset({ shape: square(7) }));

    // The sync cleared the store, which fires a delete change.
    expect(draw().clears).toBe(before + 1);
    expect(value()).toEqual(square(7));
    expect(onCommit).not.toHaveBeenCalled();
    expect(dirty()).toBe("false");
  });

  it("reseeds the draw instance when the form resets", async () => {
    const { draw, form } = await setup();
    const before = draw().clears;
    await act(async () => form().form.setFieldValue("shape", square(4)));
    expect(draw().added).toHaveLength(2);
    expect(draw().added[1]?.[0]?.geometry).toEqual(square(4));

    await act(async () => form().form.reset({ shape: square(9) }));

    expect(draw().clears).toBe(before + 2);
    expect(draw().added).toHaveLength(3);
    expect(draw().added[2]?.[0]?.geometry).toEqual(square(9));
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([square(9)]);
  });

  it("does not rebuild the draw store for the echo of its own commit", async () => {
    const { draw } = await setup({}, null);
    fireEvent.click(button("Draw a polygon"));

    await act(async () => {
      const id = draw().put(square(1), "polygon");
      draw().emitFinish(id, "draw");
    });
    expect(value()).toEqual(square(1));
    expect(draw().clears).toBe(0);
    expect(draw().added).toEqual([]);

    // A Polygon input holds one shape, so a second drawing replaces the first.
    fireEvent.click(button("Draw a polygon"));
    await act(async () => {
      const id = draw().put(square(6), "polygon");
      draw().emitFinish(id, "draw");
    });
    expect(value()).toEqual(square(6));
    expect(draw().clears).toBe(1);
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([square(6)]);
  });

  it("marks the form dirty after a commit", async () => {
    const { draw } = await setup();
    expect(dirty()).toBe("false");
    fireEvent.click(button("Edit"));

    await act(async () => {
      const id = storedId(draw().features);
      draw().replace(id, square(2));
      draw().emitFinish(id, "dragFeature", "select-move");
    });

    expect(dirty()).toBe("true");
  });

  it("calls onCommit with the stored value", async () => {
    const onCommit = vi.fn();
    const { draw } = await setup({ onCommit }, null);
    fireEvent.click(button("Draw a polygon"));

    await act(async () => {
      const id = draw().put(square(5), "polygon");
      draw().emitFinish(id, "draw");
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(square(5));
  });

  it("fits the first value once and not after its own edit", async () => {
    const { draw, map } = await setup();
    expect(map().fits).toHaveLength(1);
    expect(map().fits[0]?.bounds).toEqual([0, 0, 1, 1]);

    fireEvent.click(button("Edit"));
    await act(async () => {
      const id = storedId(draw().features);
      draw().replace(id, square(20));
      draw().emitFinish(id, "dragCoordinate", "select");
    });

    expect(value()).toEqual(square(20));
    expect(map().fits).toHaveLength(1);
  });

  it("fits with the shared padding and max fit zoom", async () => {
    const { map } = await setup();

    expect(map().fits[0]?.options).toEqual({
      padding: 20,
      maxZoom: 18,
      duration: 0,
    });
  });

  it("does not fit a value outside the longitude and latitude range", async () => {
    const { map } = await setup({}, square(261845));

    expect(map().fits).toHaveLength(0);
  });

  it("does not fit a shape that the user draws first", async () => {
    const { draw, map } = await setup({}, null);
    expect(map().fits).toHaveLength(0);
    fireEvent.click(button("Draw a polygon"));

    await act(async () => {
      const id = draw().put(square(5), "polygon");
      draw().emitFinish(id, "draw");
    });

    expect(map().fits).toHaveLength(0);
  });

  it("fits a value that arrives after mount, such as a record load", async () => {
    const { form, map } = await setup({}, null);
    expect(map().fits).toHaveLength(0);

    await act(async () => form().form.reset({ shape: square(3) }));

    expect(map().fits).toHaveLength(1);
    expect(map().fits[0]?.bounds).toEqual([3, 3, 4, 4]);
  });

  it("shows an empty draft for null and for a malformed value", async () => {
    for (const shape of [
      null,
      "not geojson",
      42,
      { type: "Polygon" },
      { type: "Point", coordinates: [1, 2] },
    ]) {
      cleanup();
      resetMaps();
      resetDraws();
      const { draw } = await setup({}, shape);
      expect(draw().added.flat(), JSON.stringify(shape)).toEqual([]);
      expect(draw().features).toEqual([]);
      expect(screen.queryByRole("alert")).toBeNull();
    }
  });

  it("uses the render mode and hides the toolbar when disabled", async () => {
    const { draw, map } = await setup({ disabled: true });

    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(draw().mode).toBe("render");
    expect(draw().added).toHaveLength(1);
    // Pan and zoom stay on: the canvas is built as usual.
    expect(map().options.scrollZoom).toBe(true);
  });

  it("draws a Polygon with a hole on a read-only source and keeps it in the value", async () => {
    const { draw, map } = await setup(
      { kind: "MultiPolygon" },
      {
        type: "MultiPolygon",
        coordinates: [holed.coordinates, square(20).coordinates],
      },
    );

    // The editor holds the plain square; the holed polygon is a source on the map.
    expect(draw().added[0]?.map((f) => f.geometry)).toEqual([square(20)]);
    const sources = Object.values(map().sources);
    expect(sources).toHaveLength(1);
    const data = defined(sources[0]).data;
    if (!isGeoFeatureCollection(data)) {
      throw new Error("Expected a GeoJSON feature collection source");
    }
    expect(data.features.map((f) => f.geometry)).toEqual([holed]);

    fireEvent.click(button("Edit"));
    await act(async () => {
      const id = storedId(draw().features);
      draw().replace(id, square(30));
      draw().emitFinish(id, "dragFeature", "select");
    });

    expect(value()).toEqual({
      type: "MultiPolygon",
      coordinates: [square(30).coordinates, holed.coordinates],
    });
  });

  describe("when the editor refuses a part", () => {
    const refusedPart = {
      type: "MultiPolygon",
      coordinates: [square(0).coordinates, square(20).coordinates],
    };
    const NOT_SHOWN = "Part of this shape cannot be shown on the map";
    const refuseSecondSquare = () =>
      refuseFeatures((f) =>
        JSON.stringify(f.geometry) === JSON.stringify(square(20))
          ? "Feature is invalid"
          : undefined,
      );

    it("keeps a part the editor refuses when another part is edited", async () => {
      refuseSecondSquare();
      const { draw } = await setup({ kind: "MultiPolygon" }, refusedPart);
      // The refused square is not drawn.
      expect(draw().getSnapshot()).toHaveLength(1);

      fireEvent.click(button("Edit"));
      await act(async () => {
        const id = storedId(draw().features);
        draw().replace(id, square(5));
        draw().emitFinish(id, "dragFeature", "select");
      });

      expect(value()).toEqual({
        type: "MultiPolygon",
        coordinates: [square(5).coordinates, square(20).coordinates],
      });
    });

    it("keeps a part the editor refuses when another part is deleted", async () => {
      refuseSecondSquare();
      const { draw } = await setup({ kind: "MultiPolygon" }, refusedPart);

      await act(async () => draw().deleteFromStore(storedId(draw().features)));

      expect(value()).toEqual({
        type: "MultiPolygon",
        coordinates: [square(20).coordinates],
      });
    });

    it("does not redraw the editor after an edit that leaves the refused part alone", async () => {
      refuseSecondSquare();
      const { draw } = await setup({ kind: "MultiPolygon" }, refusedPart);

      fireEvent.click(button("Edit"));
      await act(async () => {
        const id = storedId(draw().features);
        draw().replace(id, square(5));
        draw().emitFinish(id, "dragFeature", "select");
      });

      expect(draw().added).toHaveLength(1);
    });

    it("warns that part of the shape cannot be shown", async () => {
      refuseSecondSquare();
      await setup({ kind: "MultiPolygon" }, refusedPart);

      expect(screen.getByText(NOT_SHOWN)).toBeTruthy();
    });

    it("words the warning in English when the app did not merge mapMessages", async () => {
      refuseSecondSquare();
      await setup({ kind: "MultiPolygon" }, refusedPart, { messages: {} });

      expect(screen.getByText(NOT_SHOWN)).toBeTruthy();
    });

    it("shows no warning when the editor takes every part", async () => {
      await setup({ kind: "MultiPolygon" }, refusedPart);

      expect(screen.queryByText(NOT_SHOWN)).toBeNull();
    });

    it("drops the warning when the form resets to a shape the editor takes", async () => {
      refuseSecondSquare();
      const { form } = await setup({ kind: "MultiPolygon" }, refusedPart);
      expect(screen.getByText(NOT_SHOWN)).toBeTruthy();

      await act(async () =>
        form().form.setFieldValue("shape", {
          type: "MultiPolygon",
          coordinates: [square(0).coordinates],
        }),
      );

      expect(screen.queryByText(NOT_SHOWN)).toBeNull();
    });
  });

  it("never touches map.dragPan", async () => {
    const { draw, map } = await setup();
    let touched = 0;
    Object.defineProperty(map(), "dragPan", {
      get() {
        touched += 1;
        return { enable() {}, disable() {} };
      },
    });

    fireEvent.click(button("Edit"));
    await act(async () => {
      const id = storedId(draw().features);
      draw().emitSelect(id);
      draw().replace(id, square(2));
      draw().emitFinish(id, "dragFeature", "select");
    });
    fireEvent.click(button("Delete"));

    expect(touched).toBe(0);
  });

  it("lets the select modes rotate lines and polygons", async () => {
    const { draw } = await setup();

    for (const name of ["select", "select-move"]) {
      const flags = defined(defined(draw().modeOf(name)).options.flags);
      expect(flags.linestring?.feature?.rotateable, `${name} linestring`).toBe(
        true,
      );
      expect(flags.polygon?.feature?.rotateable, `${name} polygon`).toBe(true);
    }
    // The vertex tools belong to the edit mode only.
    const edit = defined(defined(draw().modeOf("select")).options.flags);
    expect(edit.polygon?.feature?.coordinates?.snappable).toBe(true);
    const move = defined(defined(draw().modeOf("select-move")).options.flags);
    expect(defined(move.polygon?.feature).coordinates).toBeUndefined();
  });

  it("deletes the selected feature from the toolbar", async () => {
    const { draw } = await setup();
    fireEvent.click(button("Edit"));
    expect(button("Delete").disabled).toBe(true);

    const id = storedId(draw().features);
    await act(async () => draw().emitSelect(id));
    expect(button("Delete").disabled).toBe(false);

    fireEvent.click(button("Delete"));

    expect(draw().removed).toEqual([[id]]);
    expect(value()).toBeNull();
    expect(button("Delete").disabled).toBe(true);
  });

  it("builds the modes from the snapping, distance and style props", async () => {
    const { draw } = await setup({
      snappable: false,
      shapeStyle: { color: "#ff0000" },
    });

    expect(draw().modes.map((m) => m.modeName)).toEqual([
      "point",
      "linestring",
      "polygon",
      "rectangle",
      "circle",
      "select",
      "select-move",
      "render",
    ]);
    expect(draw().modeOf("polygon")?.options.snapping).toBeUndefined();
    expect(draw().modeOf("polygon")?.options.pointerDistance).toBe(20);
    expect(draw().modeOf("polygon")?.options.styles).toMatchObject({
      outlineColor: "#ff0000",
    });
  });

  it("snaps to coordinates and lines by default", async () => {
    const { draw } = await setup();

    for (const name of ["linestring", "polygon"]) {
      expect(draw().modeOf(name)?.options.snapping).toEqual({
        toCoordinate: true,
        toLine: true,
      });
    }
  });

  it("passes snapDistance to every mode as pointerDistance", async () => {
    const { draw } = await setup({ snapDistance: 35 });

    const withDistance = draw().modes.filter((m) => m.modeName !== "render");
    expect(withDistance).toHaveLength(7);
    for (const mode of withDistance) {
      expect(mode.options.pointerDistance, mode.modeName).toBe(35);
    }
  });
});

const field = (west: number, south: number, east: number, north: number) => ({
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

/** Draws `cutter` with the cut tool the way Terra Draw would. */
async function drawCutter(
  draw: () => (typeof draws)[number],
  cutter: Geometry,
) {
  fireEvent.click(button("Cut a hole"));
  expect(draw().mode).toBe("polygon");
  await act(async () => {
    const id = draw().put(cutter, "polygon");
    draw().emitFinish(id, "draw");
  });
}

describe("ShapeInput cut tool", () => {
  it("subtracts the finished polygon from the stored polygon, commits and removes the cutter", async () => {
    const onCommit = vi.fn();
    const { draw } = await setup({ onCommit }, field(0, 0, 10, 10));

    await drawCutter(draw, field(5, -5, 15, 5));

    const stored = value();
    expect(stored.type).toBe("Polygon");
    // An L: six corners and the closing position.
    expect(stored.coordinates).toHaveLength(1);
    expect(stored.coordinates[0]).toHaveLength(7);
    expect(stored.coordinates[0]).toContainEqual([5, 5]);
    expect(stored.coordinates[0]).not.toContainEqual([15, 5]);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(stored);
    expect(draw().mode).toBe("render");
    expect(button("Cut a hole").getAttribute("aria-pressed")).toBe("false");
    // The cutter is gone from the map: the store holds only the cut polygon.
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([stored]);
  });

  it("commits nothing when the cutter misses every polygon", async () => {
    const onCommit = vi.fn();
    const { draw } = await setup({ onCommit }, field(0, 0, 10, 10));

    await drawCutter(draw, field(20, 20, 30, 30));

    expect(value()).toEqual(field(0, 0, 10, 10));
    expect(onCommit).not.toHaveBeenCalled();
    expect(dirty()).toBe("false");
    expect(draw().mode).toBe("render");
    expect(button("Cut a hole").getAttribute("aria-pressed")).toBe("false");
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([field(0, 0, 10, 10)]);
  });
});

describe("ShapeInput cut tool on every kind", () => {
  it("leaves a single-shape polygon alone when the cut would split it", async () => {
    const onCommit = vi.fn();
    const { draw } = await setup({ onCommit }, field(0, 0, 10, 10));

    await drawCutter(draw, field(4, -5, 6, 15));

    // Polygon holds one shape: storing either half would delete the other.
    expect(value()).toEqual(field(0, 0, 10, 10));
    expect(onCommit).not.toHaveBeenCalled();
    expect(draw().mode).toBe("render");
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([field(0, 0, 10, 10)]);
  });

  it("keeps both halves of a MultiPolygon cut in two", async () => {
    const { draw } = await setup(
      { kind: "MultiPolygon" },
      { type: "MultiPolygon", coordinates: [field(0, 0, 10, 10).coordinates] },
    );

    await drawCutter(draw, field(4, -5, 6, 15));

    expect(value().type).toBe("MultiPolygon");
    expect(value().coordinates).toHaveLength(2);
  });

  it("cuts a polygon that already has a hole", async () => {
    const { draw } = await setup({}, holed);

    await drawCutter(draw, field(5, 5, 8, 8));

    expect(value().type).toBe("Polygon");
    expect(value().coordinates).toHaveLength(3);
  });

  it("a cut keeps the FeatureCollection's name and crs", async () => {
    const crs = { type: "name", properties: { name: "EPSG:4326" } };
    const { draw } = await setup(
      { kind: "FeatureCollection" },
      {
        type: "FeatureCollection",
        name: "sites",
        crs,
        features: [
          {
            type: "Feature",
            geometry: field(0, 0, 10, 10),
            properties: {},
          },
        ],
      },
    );

    await drawCutter(draw, field(5, -5, 15, 5));

    const stored = value();
    expect(stored.name).toBe("sites");
    expect(stored.crs).toEqual(crs);
    expect(stored.features).toHaveLength(1);
    expect(stored.features[0].geometry.coordinates[0]).toHaveLength(7);
  });

  it("cuts a held part of a MultiPolygon", async () => {
    const { draw } = await setup(
      { kind: "MultiPolygon" },
      {
        type: "MultiPolygon",
        coordinates: [holed.coordinates, field(20, 0, 30, 10).coordinates],
      },
    );

    await drawCutter(draw, field(5, 5, 8, 8));

    expect(value().type).toBe("MultiPolygon");
    const rings = value().coordinates.map((p: unknown[]) => p.length);
    expect(rings.sort()).toEqual([1, 3]);
  });
});

describe("ShapeInput", () => {
  it("draws the polygon left with a hole after a cut on a read-only source", async () => {
    const { draw, map } = await setup(
      { kind: "MultiPolygon" },
      {
        type: "MultiPolygon",
        coordinates: [holed.coordinates, field(20, 0, 30, 10).coordinates],
      },
    );
    expect(draw().added[0]?.map((f) => f.geometry)).toEqual([
      field(20, 0, 30, 10),
    ]);

    await drawCutter(draw, field(24, 4, 26, 6));

    // A holed polygon is not for Terra Draw: both holed parts are read-only now.
    expect(draw().getSnapshot()).toEqual([]);
    const sources = Object.values(map().sources);
    expect(sources).toHaveLength(1);
    const data = defined(sources[0]).data;
    if (!isGeoFeatureCollection(data)) {
      throw new Error("Expected a GeoJSON feature collection source");
    }
    const rings = data.features.map((f) =>
      f.geometry?.type === "Polygon" ? f.geometry.coordinates.length : 0,
    );
    expect(rings).toEqual([2, 2]);
    expect(value().type).toBe("MultiPolygon");
    expect(value().coordinates).toHaveLength(2);
  });
});

it("PolygonInput and MultiPolygonInput offer the cut tool and PointInput does not", async () => {
  for (const input of [
    <PolygonInput key="p" source="shape" />,
    <MultiPolygonInput key="m" source="shape" />,
  ]) {
    cleanup();
    resetMaps();
    resetDraws();
    await mountShapeInput(input);
    expect(toolbarNames()).toEqual([
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);
  }
  cleanup();
  resetMaps();
  resetDraws();
  await mountShapeInput(<PointInput source="shape" />);
  expect(toolbarNames()).not.toContain("Cut a hole");
});

describe("ShapeInput snap failure", () => {
  const drawn = {
    type: "LineString",
    coordinates: [
      [0, 0],
      [1, 1],
    ],
  };
  const failingRouter = {
    name: "fake",
    snapToRoad: vi.fn(async () => null),
  };
  const warnings = (
    notifications: ReturnType<typeof createNotificationStore>,
  ) =>
    notifications.getSnapshot().map(({ message, type }) => ({ message, type }));

  async function drawLine(draw: () => (typeof draws)[number]) {
    fireEvent.click(button("Draw a line"));
    await act(async () => {
      const id = draw().put(drawn, "linestring");
      draw().emitFinish(id, "draw", "linestring");
    });
  }

  it("warns when snapping to roads fails and keeps the drawn line", async () => {
    const notifications = createNotificationStore();
    const { draw } = await mountShapeInput(
      <LineStringInput
        source="shape"
        label="Route"
        snapToRoads={failingRouter}
      />,
      null,
      {},
      notifications,
    );
    await drawLine(draw);

    expect(warnings(notifications)).toEqual([
      { message: "chelone.map.snap_failed", type: "warning" },
    ]);
    expect(storedValue()).toEqual(drawn);
  });

  it("warns when the router throws and keeps the drawn line", async () => {
    const notifications = createNotificationStore();
    const { draw } = await mountShapeInput(
      <LineStringInput
        source="shape"
        label="Route"
        snapToRoads={{
          name: "fake",
          snapToRoad: async () => {
            throw new Error("offline");
          },
        }}
      />,
      null,
      {},
      notifications,
    );
    await drawLine(draw);

    expect(warnings(notifications)).toEqual([
      { message: "chelone.map.snap_failed", type: "warning" },
    ]);
    expect(storedValue()).toEqual(drawn);
  });

  it("stays quiet when a refine returns null and names no failure message", async () => {
    const notifications = createNotificationStore();
    const { draw } = await mountShapeInput(
      <ShapeInput
        source="shape"
        kind="LineString"
        label="Route"
        refine={async () => null}
      />,
      null,
      {},
      notifications,
    );
    await drawLine(draw);

    expect(warnings(notifications)).toEqual([]);
  });
});
