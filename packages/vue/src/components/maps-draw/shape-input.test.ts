/**
 * ShapeInput, DrawToolbar and toolMode tests. jsdom has no WebGL and sends no
 * pointer events, so `maplibre-gl` and `terra-draw` are the stand-ins in the
 * `__fixtures__` folders. A test mounts the input in a form under `<Admin>` and
 * the maps provider, then plays Terra Draw's part on the fake instance (a
 * stored feature changes, then `finish` fires) and asserts the form's value,
 * the DOM and what the instance was asked to do.
 */

import {
  createI18n,
  createNotificationStore,
  fakeDataProvider,
  isGeoFeatureCollection,
  isGeoGeometry,
  mapMessages,
  type Notification,
  type NotificationStore,
  rasterTileStyle,
  type ShapeValue,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import {
  maps,
  resetFake as resetMaps,
} from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/use-map";
import {
  draws,
  type FakeFeature,
  refuseFeatures,
  resetFake as resetDraws,
} from "./__fixtures__/fake-terra-draw";
import DrawToolbar, { type DrawToolbarProps } from "./draw-toolbar.vue";
import ShapeInput, { type ShapeInputProps } from "./shape-input.vue";
import { MultiPolygonInput, PointInput, PolygonInput } from "./shape-inputs";
import { toolMode } from "./use-terra-draw";

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

function mountUnderAdmin(
  content: () => ReturnType<typeof h>,
  messages: Record<string, string> = mapMessages,
  notifications?: NotificationStore,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MapsProvider, { mapStyle: style }, () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
              i18n: createI18n({
                locale: "en",
                messages: { en: messages },
              }),
              notifications,
            },
            { default: content },
          ),
        );
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  return wrapper;
}

async function setup(
  props: Partial<ShapeInputProps> = {},
  shape: unknown = square(),
  {
    ready = true,
    messages = mapMessages,
  }: { ready?: boolean; messages?: Record<string, string> } = {},
) {
  // Admin's toast drains the store, so keep what was pushed.
  const notifications = createNotificationStore();
  const pushed: Notification[] = [];
  notifications.subscribe(() => {
    for (const item of notifications.getSnapshot()) {
      if (!pushed.some((seen) => seen.id === item.id)) pushed.push(item);
    }
  });
  let current: UseFormReturn<Values> | undefined;
  const commits: unknown[] = [];
  const FormHost = defineComponent({
    setup() {
      current = useForm<Values>({
        record: { shape },
        onSubmit: async () => undefined,
      });
      return () =>
        h(ShapeInput, {
          source: "shape",
          kind: "Polygon",
          label: "Area",
          onCommit: (value: unknown) => commits.push(value),
          ...props,
        });
    },
  });
  const wrapper = mountUnderAdmin(() => h(FormHost), messages, notifications);
  // Lets the fake map's microtask `load` fire and Vue render what follows.
  await flushPromises();
  const draw = () => {
    const instance = draws[draws.length - 1];
    if (!instance) throw new Error("no draw instance");
    return instance;
  };
  if (ready) {
    draw().emitReady();
    await flushPromises();
  }
  const form = () => {
    if (!current) throw new Error("form not mounted");
    return current;
  };
  return {
    wrapper,
    draw,
    form,
    commits,
    value: () => form().form.store.state.values.shape,
    dirty: () => form().form.store.state.isDirty,
    /** What the input pushed as a warning, oldest first. */
    warnings: () =>
      pushed
        .filter((n) => n.type === "warning")
        .map(({ message, type }) => ({ message, type })),
    map: () => {
      const map = maps[0];
      if (!map) throw new Error("no map");
      return map;
    },
  };
}

const button = (wrapper: VueWrapper, name: string) => {
  const found = wrapper
    .findAll("button")
    .find((b) => b.attributes("aria-label") === name);
  if (!found) throw new Error(`no button named ${name}`);
  return found;
};
const disabled = (wrapper: VueWrapper, name: string) =>
  elementOf(button(wrapper, name).element, HTMLButtonElement).disabled;

/** The id of the user's feature in the fake store. */
const storedId = (features: FakeFeature[]) => {
  const id = features.find((f) => f.id !== undefined)?.id;
  if (id === undefined) throw new Error("no stored feature");
  return id;
};

describe("ShapeInput", () => {
  it("hydrates the draft from the field value and adds the features to the draw instance", async () => {
    const { draw, wrapper } = await setup();

    expect(draw().added).toHaveLength(1);
    const added = draw().added[0] ?? [];
    expect(added).toHaveLength(1);
    expect(added[0]?.geometry).toEqual(square());
    expect(added[0]?.properties.mode).toBe("polygon");
    expect(wrapper.text()).toContain("Area");
    expect(wrapper.find('[data-slot="shape-input"]').exists()).toBe(true);
  });

  it("starts the draw instance after the map loads and stops it on unmount", async () => {
    const { draw, map, wrapper } = await setup({}, square(), { ready: false });

    expect(draws).toHaveLength(1);
    expect(draw().starts).toBe(1);
    expect(draw().adapter.map).toBe(map());
    // The features wait for the instance's `ready` event.
    expect(draw().added).toEqual([]);
    expect(draw().modeCalls).toEqual([]);

    draw().emitReady();
    await flushPromises();
    expect(draw().added).toHaveLength(1);
    expect(draw().mode).toBe("render");

    wrapper.unmount();
    expect(draw().stops).toBe(1);
  });

  it("commits the form on a finished drawing and clears the tool", async () => {
    const { draw, wrapper, value } = await setup({}, null);

    await button(wrapper, "Draw a polygon").trigger("click");
    expect(button(wrapper, "Draw a polygon").attributes("aria-pressed")).toBe(
      "true",
    );
    expect(draw().mode).toBe("polygon");

    const id = draw().put(square(5), "polygon");
    draw().emitFinish(id, "draw");
    await flushPromises();

    expect(value()).toEqual(square(5));
    expect(button(wrapper, "Draw a polygon").attributes("aria-pressed")).toBe(
      "false",
    );
    expect(draw().mode).toBe("render");
  });

  it("commits on a finished vertex drag", async () => {
    const { draw, wrapper, value } = await setup();
    await button(wrapper, "Edit").trigger("click");
    expect(draw().mode).toBe("select");

    const id = storedId(draw().features);
    draw().replace(id, square(2));
    draw().emitFinish(id, "dragCoordinate", "select");
    await flushPromises();

    expect(value()).toEqual(square(2));
  });

  it("writes nothing for changes outside a finish or a delete", async () => {
    const { draw, wrapper, value, dirty } = await setup();
    await button(wrapper, "Edit").trigger("click");
    const id = storedId(draw().features);

    draw().replace(id, square(3));
    draw().emitChange([id], "update", { target: "geometry" });
    draw().emitChange([id], "create");
    draw().emitSelect(id);
    draw().emitDeselect(id);
    await flushPromises();

    expect(value()).toEqual(square());
    expect(dirty()).toBe(false);
  });

  it("commits on a removed feature and stores null when no feature is left", async () => {
    const { draw, wrapper, value } = await setup();
    await button(wrapper, "Edit").trigger("click");

    draw().deleteFromStore(storedId(draw().features));
    await flushPromises();

    expect(value()).toBeNull();
  });

  it("commits once for a drawing that deletes its closing point before it finishes", async () => {
    const { draw, wrapper, commits, value } = await setup({}, null);
    await button(wrapper, "Draw a polygon").trigger("click");

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
    await flushPromises();

    expect(commits).toHaveLength(1);
    expect(value()).toEqual(square(5));
  });

  it("commits once for a snapped vertex drag", async () => {
    const { draw, wrapper, commits, value } = await setup();
    await button(wrapper, "Edit").trigger("click");

    const id = storedId(draw().features);
    const snapping = draw().put(
      { type: "Point", coordinates: [1, 1] },
      "polygon",
    );
    draw().setProperty(snapping, "snappingPoint", true);
    draw().replace(id, square(2));
    draw().emitChange([snapping], "delete");
    draw().emitFinish(id, "dragCoordinate", "select");
    await flushPromises();

    expect(commits).toHaveLength(1);
    expect(value()).toEqual(square(2));
  });

  it("ignores the changes of its own sync", async () => {
    const { draw, form, commits, value, dirty } = await setup();
    const before = draw().clears;

    form().reset({ shape: square(7) });
    await flushPromises();

    // The sync cleared the store, which fires a delete change.
    expect(draw().clears).toBe(before + 1);
    expect(value()).toEqual(square(7));
    expect(commits).toEqual([]);
    expect(dirty()).toBe(false);
  });

  it("reseeds the draw instance when the form resets", async () => {
    const { draw, form } = await setup();
    const before = draw().clears;
    form().form.setFieldValue("shape", square(4));
    await flushPromises();
    expect(draw().added).toHaveLength(2);
    expect(draw().added[1]?.[0]?.geometry).toEqual(square(4));

    form().reset({ shape: square(9) });
    await flushPromises();

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
    const { draw, wrapper, value } = await setup({}, null);
    await button(wrapper, "Draw a polygon").trigger("click");

    const first = draw().put(square(1), "polygon");
    draw().emitFinish(first, "draw");
    await flushPromises();
    expect(value()).toEqual(square(1));
    expect(draw().clears).toBe(0);
    expect(draw().added).toEqual([]);

    // A Polygon input holds one shape, so a second drawing replaces the first.
    await button(wrapper, "Draw a polygon").trigger("click");
    const second = draw().put(square(6), "polygon");
    draw().emitFinish(second, "draw");
    await flushPromises();
    expect(value()).toEqual(square(6));
    expect(draw().clears).toBe(1);
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([square(6)]);
  });

  it("marks the form dirty after a commit", async () => {
    const { draw, wrapper, dirty } = await setup();
    expect(dirty()).toBe(false);
    await button(wrapper, "Edit").trigger("click");

    const id = storedId(draw().features);
    draw().replace(id, square(2));
    draw().emitFinish(id, "dragFeature", "select-move");
    await flushPromises();

    expect(dirty()).toBe(true);
  });

  it("emits commit with the stored value", async () => {
    const { draw, wrapper, commits } = await setup({}, null);
    await button(wrapper, "Draw a polygon").trigger("click");

    const id = draw().put(square(5), "polygon");
    draw().emitFinish(id, "draw");
    await flushPromises();

    expect(commits).toEqual([square(5)]);
  });

  it("fits the first value once and not after its own edit", async () => {
    const { draw, map, wrapper, value } = await setup();
    expect(map().fits).toHaveLength(1);
    expect(map().fits[0]?.bounds).toEqual([0, 0, 1, 1]);

    await button(wrapper, "Edit").trigger("click");
    const id = storedId(draw().features);
    draw().replace(id, square(20));
    draw().emitFinish(id, "dragCoordinate", "select");
    await flushPromises();

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

  it("does not fit a shape that the user draws first", async () => {
    const { draw, map, wrapper } = await setup({}, null);
    expect(map().fits).toHaveLength(0);
    await button(wrapper, "Draw a polygon").trigger("click");

    const id = draw().put(square(5), "polygon");
    draw().emitFinish(id, "draw");
    await flushPromises();

    expect(map().fits).toHaveLength(0);
  });

  it("fits a value that arrives after mount, such as a record load", async () => {
    const { form, map } = await setup({}, null);
    expect(map().fits).toHaveLength(0);

    form().reset({ shape: square(3) });
    await flushPromises();

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
      for (const wrapper of mounted.splice(0)) wrapper.unmount();
      resetMaps();
      resetDraws();
      const { draw, wrapper } = await setup({}, shape);
      expect(draw().added.flat(), JSON.stringify(shape)).toEqual([]);
      expect(draw().features).toEqual([]);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
    }
  });

  it("uses the render mode and hides the toolbar when disabled", async () => {
    const { draw, map, wrapper } = await setup({ disabled: true });

    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
    expect(draw().mode).toBe("render");
    expect(draw().added).toHaveLength(1);
    // Pan and zoom stay on: the canvas is built as usual.
    expect(map().options.scrollZoom).toBe(true);
  });

  it("draws a Polygon with a hole on a read-only source and keeps it in the value", async () => {
    const { draw, map, wrapper, value } = await setup(
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
      throw new Error("Expected a FeatureCollection");
    }
    expect(data.features.map((f) => f.geometry)).toEqual([holed]);

    await button(wrapper, "Edit").trigger("click");
    const id = storedId(draw().features);
    draw().replace(id, square(30));
    draw().emitFinish(id, "dragFeature", "select");
    await flushPromises();

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
      const { draw, wrapper, value } = await setup(
        { kind: "MultiPolygon" },
        refusedPart,
      );
      // The refused square is not drawn.
      expect(draw().getSnapshot()).toHaveLength(1);

      await button(wrapper, "Edit").trigger("click");
      const id = storedId(draw().features);
      draw().replace(id, square(5));
      draw().emitFinish(id, "dragFeature", "select");
      await flushPromises();

      expect(value()).toEqual({
        type: "MultiPolygon",
        coordinates: [square(5).coordinates, square(20).coordinates],
      });
    });

    it("keeps a part the editor refuses when another part is deleted", async () => {
      refuseSecondSquare();
      const { draw, value } = await setup(
        { kind: "MultiPolygon" },
        refusedPart,
      );

      draw().deleteFromStore(storedId(draw().features));
      await flushPromises();

      expect(value()).toEqual({
        type: "MultiPolygon",
        coordinates: [square(20).coordinates],
      });
    });

    it("does not redraw the editor after an edit that leaves the refused part alone", async () => {
      refuseSecondSquare();
      const { draw, wrapper } = await setup(
        { kind: "MultiPolygon" },
        refusedPart,
      );

      await button(wrapper, "Edit").trigger("click");
      const id = storedId(draw().features);
      draw().replace(id, square(5));
      draw().emitFinish(id, "dragFeature", "select");
      await flushPromises();

      expect(draw().added).toHaveLength(1);
    });

    it("warns that part of the shape cannot be shown", async () => {
      refuseSecondSquare();
      const { wrapper } = await setup({ kind: "MultiPolygon" }, refusedPart);

      expect(wrapper.text()).toContain(NOT_SHOWN);
    });

    it("words the warning in English when the app did not merge mapMessages", async () => {
      refuseSecondSquare();
      const { wrapper } = await setup({ kind: "MultiPolygon" }, refusedPart, {
        messages: {},
      });

      expect(wrapper.text()).toContain(NOT_SHOWN);
    });

    it("shows no warning when the editor takes every part", async () => {
      const { wrapper } = await setup({ kind: "MultiPolygon" }, refusedPart);

      expect(wrapper.text()).not.toContain(NOT_SHOWN);
    });

    it("drops the warning when the form resets to a shape the editor takes", async () => {
      refuseSecondSquare();
      const { wrapper, form } = await setup(
        { kind: "MultiPolygon" },
        refusedPart,
      );
      expect(wrapper.text()).toContain(NOT_SHOWN);

      form().form.setFieldValue("shape", {
        type: "MultiPolygon",
        coordinates: [square(0).coordinates],
      });
      await flushPromises();

      expect(wrapper.text()).not.toContain(NOT_SHOWN);
    });
  });

  it("never touches map.dragPan", async () => {
    const { draw, map, wrapper } = await setup();
    let touched = 0;
    Object.defineProperty(map(), "dragPan", {
      get() {
        touched += 1;
        return { enable() {}, disable() {} };
      },
    });

    await button(wrapper, "Edit").trigger("click");
    const id = storedId(draw().features);
    draw().emitSelect(id);
    draw().replace(id, square(2));
    draw().emitFinish(id, "dragFeature", "select");
    await flushPromises();
    await button(wrapper, "Delete").trigger("click");

    expect(touched).toBe(0);
  });

  it("lets the select modes rotate lines and polygons", async () => {
    const { draw } = await setup();

    for (const name of ["select", "select-move"]) {
      const flags = defined(draw().modeOf(name)?.options.flags);
      expect(flags.linestring?.feature?.rotateable, `${name} linestring`).toBe(
        true,
      );
      expect(flags.polygon?.feature?.rotateable, `${name} polygon`).toBe(true);
    }
    // The vertex tools belong to the edit mode only.
    const edit = defined(draw().modeOf("select")?.options.flags);
    expect(edit.polygon?.feature?.coordinates?.snappable).toBe(true);
    const move = defined(draw().modeOf("select-move")?.options.flags);
    expect(defined(defined(move.polygon).feature).coordinates).toBeUndefined();
  });

  it("deletes the selected feature from the toolbar", async () => {
    const { draw, wrapper, value } = await setup();
    await button(wrapper, "Edit").trigger("click");
    expect(disabled(wrapper, "Delete")).toBe(true);

    const id = storedId(draw().features);
    draw().emitSelect(id);
    await flushPromises();
    expect(disabled(wrapper, "Delete")).toBe(false);

    await button(wrapper, "Delete").trigger("click");
    await flushPromises();

    expect(draw().removed).toEqual([[id]]);
    expect(value()).toBeNull();
    expect(disabled(wrapper, "Delete")).toBe(true);
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

  it("an aborted refine does not warn", async () => {
    const drawn = (offset: number): Geometry => ({
      type: "LineString",
      coordinates: [
        [offset, offset],
        [offset + 1, offset + 1],
      ],
    });
    const calls: {
      signal: AbortSignal;
      settle: (result: ShapeValue | null) => void;
    }[] = [];
    const refine: ShapeInputProps["refine"] = (_value, { signal }) =>
      new Promise<ShapeValue | null>((resolve) =>
        calls.push({ signal, settle: resolve }),
      );
    const { draw, wrapper, warnings } = await setup(
      {
        kind: "LineString",
        refine,
        refineFailedMessage: "chelone.map.snap_failed",
      },
      null,
    );

    await button(wrapper, "Draw a line").trigger("click");
    const first = draw().put(drawn(1), "linestring");
    draw().emitFinish(first, "draw", "linestring");
    await flushPromises();
    expect(calls).toHaveLength(1);

    // A newer edit aborts the pending refine.
    await button(wrapper, "Draw a line").trigger("click");
    const second = draw().put(drawn(2), "linestring");
    draw().emitFinish(second, "draw", "linestring");
    await flushPromises();
    expect(calls[0]?.signal.aborted).toBe(true);

    // The aborted call answers with null, which a live one would warn about.
    calls[0]?.settle(null);
    await flushPromises();
    expect(warnings()).toEqual([]);
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
  wrapper: VueWrapper,
  draw: () => (typeof draws)[number],
  cutter: Geometry,
) {
  await button(wrapper, "Cut a hole").trigger("click");
  expect(draw().mode).toBe("polygon");
  const id = draw().put(cutter, "polygon");
  draw().emitFinish(id, "draw");
  await flushPromises();
}

describe("ShapeInput cut tool", () => {
  it("subtracts the finished polygon from the stored polygon, commits and removes the cutter", async () => {
    const { draw, wrapper, commits, value } = await setup(
      {},
      field(0, 0, 10, 10),
    );

    await drawCutter(wrapper, draw, field(5, -5, 15, 5));

    const stored = value();
    if (!isGeoGeometry(stored) || stored.type !== "Polygon") {
      throw new Error("Expected a Polygon");
    }
    expect(stored.type).toBe("Polygon");
    // An L: six corners and the closing position.
    expect(stored.coordinates).toHaveLength(1);
    expect(stored.coordinates[0]).toHaveLength(7);
    expect(stored.coordinates[0]).toContainEqual([5, 5]);
    expect(stored.coordinates[0]).not.toContainEqual([15, 5]);
    expect(commits).toEqual([stored]);
    expect(draw().mode).toBe("render");
    expect(button(wrapper, "Cut a hole").attributes("aria-pressed")).toBe(
      "false",
    );
    // The cutter is gone from the map: the store holds only the cut polygon.
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([stored]);
  });

  it("a cut keeps the FeatureCollection's name and crs", async () => {
    const crs = { type: "name", properties: { name: "EPSG:4326" } };
    const { draw, wrapper, value } = await setup(
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

    await drawCutter(wrapper, draw, field(5, -5, 15, 5));

    const stored = value();
    if (
      !isGeoFeatureCollection(stored) ||
      !("name" in stored) ||
      !("crs" in stored)
    ) {
      throw new Error("Expected a FeatureCollection with name and crs");
    }
    expect(stored.name).toBe("sites");
    expect(stored.crs).toEqual(crs);
    expect(stored.features).toHaveLength(1);
    const geometry = defined(stored.features[0]).geometry;
    if (geometry?.type !== "Polygon") throw new Error("Expected a Polygon");
    expect(geometry.coordinates[0]).toHaveLength(7);
  });

  it("commits nothing when the cutter misses every polygon", async () => {
    const { draw, wrapper, commits, value, dirty } = await setup(
      {},
      field(0, 0, 10, 10),
    );

    await drawCutter(wrapper, draw, field(20, 20, 30, 30));

    expect(value()).toEqual(field(0, 0, 10, 10));
    expect(commits).toEqual([]);
    expect(dirty()).toBe(false);
    expect(draw().mode).toBe("render");
    expect(button(wrapper, "Cut a hole").attributes("aria-pressed")).toBe(
      "false",
    );
    expect(
      draw()
        .getSnapshot()
        .map((f) => f.geometry),
    ).toEqual([field(0, 0, 10, 10)]);
  });

  it.each([
    ["Polygon", field(0, 0, 10, 10)],
    ["Geometry", field(0, 0, 10, 10)],
    [
      "Feature",
      { type: "Feature", properties: {}, geometry: field(0, 0, 10, 10) },
    ],
    ["BBox", [0, 0, 10, 10]],
  ] as const)(
    "commits nothing when a cut would split a %s value in two",
    async (kind, stored) => {
      const { draw, wrapper, commits, value, dirty } = await setup(
        { kind, tools: ["cut"] },
        stored,
      );

      await drawCutter(wrapper, draw, field(4, -5, 6, 15));

      expect(value()).toEqual(stored);
      expect(commits).toEqual([]);
      expect(dirty()).toBe(false);
      expect(draw().mode).toBe("render");
    },
  );

  it("commits nothing when a hole cut would split a MultiPolygon held by a Geometry value", async () => {
    const stored = {
      type: "MultiPolygon",
      coordinates: [
        field(0, 0, 10, 10).coordinates,
        field(20, 0, 30, 10).coordinates,
      ],
    };
    const { draw, wrapper, commits, value } = await setup(
      { kind: "Geometry" },
      stored,
    );

    await drawCutter(wrapper, draw, field(24, 4, 26, 6));

    expect(value()).toEqual(stored);
    expect(commits).toEqual([]);
  });
});

describe("ShapeInput", () => {
  it("draws the polygon left with a hole after a cut on a read-only source", async () => {
    const { draw, map, wrapper, value } = await setup(
      { kind: "MultiPolygon" },
      {
        type: "MultiPolygon",
        coordinates: [holed.coordinates, field(20, 0, 30, 10).coordinates],
      },
    );
    expect(draw().added[0]?.map((f) => f.geometry)).toEqual([
      field(20, 0, 30, 10),
    ]);

    await drawCutter(wrapper, draw, field(24, 4, 26, 6));

    // A holed polygon is not for Terra Draw: both holed parts are read-only now.
    expect(draw().getSnapshot()).toEqual([]);
    const sources = Object.values(map().sources);
    expect(sources).toHaveLength(1);
    const data = defined(sources[0]).data;
    if (!isGeoFeatureCollection(data)) {
      throw new Error("Expected a FeatureCollection");
    }
    const rings = data.features.map((f) =>
      f.geometry?.type === "Polygon" ? f.geometry.coordinates.length : 0,
    );
    expect(rings).toEqual([2, 2]);
    const stored = value();
    if (!isGeoGeometry(stored) || stored.type !== "MultiPolygon") {
      throw new Error("Expected a MultiPolygon");
    }
    expect(stored.type).toBe("MultiPolygon");
    expect(stored.coordinates).toHaveLength(2);
  });
});

it("PolygonInput and MultiPolygonInput offer the cut tool and PointInput does not", async () => {
  const names = async (input: () => ReturnType<typeof h>) => {
    resetMaps();
    resetDraws();
    const Host = defineComponent({
      setup() {
        useForm<Values>({ record: { shape: null }, onSubmit: async () => {} });
        return input;
      },
    });
    const wrapper = mountUnderAdmin(() => h(Host));
    await flushPromises();
    const found = wrapper
      .findAll('[role="toolbar"] button')
      .map((b) => b.attributes("aria-label"));
    wrapper.unmount();
    mounted.length = 0;
    return found;
  };
  for (const input of [PolygonInput, MultiPolygonInput]) {
    expect(await names(() => h(input, { source: "shape" }))).toEqual([
      "Draw a polygon",
      "Draw a rectangle",
      "Draw a circle",
      "Cut a hole",
      "Edit",
      "Move",
      "Delete",
    ]);
  }
  expect(await names(() => h(PointInput, { source: "shape" }))).not.toContain(
    "Cut a hole",
  );
});

function mountToolbar(props: Partial<DrawToolbarProps> = {}) {
  const changes: unknown[] = [];
  const deletes: unknown[] = [];
  const wrapper = mountUnderAdmin(() =>
    h(DrawToolbar, {
      tools: ["draw-polygon", "edit", "move", "delete"],
      active: null,
      canDelete: false,
      "onUpdate:active": (tool: unknown) => changes.push(tool),
      onDelete: () => deletes.push(true),
      ...props,
    }),
  );
  return { wrapper, changes, deletes };
}

describe("DrawToolbar", () => {
  it("renders a labelled toolbar with one pressed button for the active tool", async () => {
    const { wrapper } = mountToolbar({ active: "edit" });
    await flushPromises();

    const toolbar = wrapper.find('[role="toolbar"]');
    expect(toolbar.attributes("aria-label")).toBe("Map tools");
    expect(
      toolbar.findAll("button").map((b) => b.attributes("aria-label")),
    ).toEqual(["Draw a polygon", "Edit", "Move", "Delete"]);
    expect(button(wrapper, "Edit").attributes("aria-pressed")).toBe("true");
    expect(button(wrapper, "Draw a polygon").attributes("aria-pressed")).toBe(
      "false",
    );
    expect(button(wrapper, "Move").attributes("aria-pressed")).toBe("false");
    expect(toolbar.findAll("svg")).toHaveLength(4);
  });

  it("clears the tool when the active button is pressed again", async () => {
    const { wrapper, changes } = mountToolbar({ active: "edit" });
    await flushPromises();

    await button(wrapper, "Move").trigger("click");
    expect(changes.at(-1)).toBe("move");

    await button(wrapper, "Edit").trigger("click");
    expect(changes.at(-1)).toBeNull();
  });

  it("disables delete until a feature is selected and emits delete", async () => {
    const first = mountToolbar({ canDelete: false });
    await flushPromises();
    expect(disabled(first.wrapper, "Delete")).toBe(true);
    await button(first.wrapper, "Delete").trigger("click");
    expect(first.deletes).toEqual([]);
    first.wrapper.unmount();
    mounted.length = 0;

    const second = mountToolbar({ canDelete: true });
    await flushPromises();
    expect(disabled(second.wrapper, "Delete")).toBe(false);
    expect(button(second.wrapper, "Delete").attributes("aria-pressed")).toBe(
      undefined,
    );
    await button(second.wrapper, "Delete").trigger("click");
    expect(second.deletes).toHaveLength(1);
    expect(second.changes).toEqual([]);
  });
});

describe("toolMode", () => {
  it("maps every tool to its Terra Draw mode name", () => {
    expect(toolMode("draw-point")).toBe("point");
    expect(toolMode("draw-line")).toBe("linestring");
    expect(toolMode("draw-polygon")).toBe("polygon");
    expect(toolMode("draw-rectangle")).toBe("rectangle");
    expect(toolMode("draw-circle")).toBe("circle");
    expect(toolMode("edit")).toBe("select");
    expect(toolMode("move")).toBe("select-move");
    expect(toolMode(null)).toBe("render");
    expect(toolMode(undefined)).toBe("render");
    expect(toolMode("draw-polygon", true)).toBe("render");
    expect(toolMode("edit", true)).toBe("render");
  });
});
