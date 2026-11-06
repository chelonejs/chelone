/**
 * The limits of a shape input: `minVertices`, `maxVertices`, `minAreaM2` and
 * `allowSelfIntersection` add validators that flag the field. The drawn shape
 * is still written to the form. Terra Draw is the fake in `__fixtures__`; a
 * test plays its part on the instance and reads the form value and the error.
 */

import {
  createI18n,
  fakeDataProvider,
  mapMessages,
  rasterTileStyle,
  required,
  type ShapeValue,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import type { Polygon } from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import { resetFake as resetMaps } from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/use-map";
import { draws, resetFake as resetDraws } from "./__fixtures__/fake-terra-draw";
import ShapeInput from "./shape-input.vue";
import { PolygonInput } from "./shape-inputs";
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

type Values = { shape: unknown };

const ring = (...points: [number, number][]): Polygon => ({
  type: "Polygon",
  coordinates: [[...points, defined(points[0])]],
});
const triangle = ring([0, 0], [1, 0], [0, 1]);
const square = ring([0, 0], [1, 0], [1, 1], [0, 1]);
const pentagon = ring([0, 0], [1, 0], [1, 1], [0.5, 1.5], [0, 1]);
const bowTie = ring([0, 0], [1, 1], [1, 0], [0, 1]);
// 0.0001 degrees is about 11 m, so the square covers about 124 m2.
const tiny = ring([0, 0], [0.0001, 0], [0.0001, 0.0001], [0, 0.0001]);
// A ring with two distinct vertices: a line closed on itself.
const twoVertices = ring([0, 0], [1, 1]);

/** Mounts `input` as the only field of a form under Admin and the maps provider. */
async function mountShapeInput(
  input: () => VNode,
  shape: ShapeValue | null = null,
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
        h(MapsProvider, { mapStyle: style }, () =>
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
  await flushPromises();
  const draw = () => {
    const instance = draws[draws.length - 1];
    if (!instance) throw new Error("no draw instance");
    return instance;
  };
  draw().emitReady();
  await flushPromises();
  const form = () => {
    if (!current) throw new Error("form not mounted");
    return current;
  };
  return {
    wrapper,
    draw,
    submit: async () => {
      await form().submit();
      await flushPromises();
    },
    value: () => form().form.store.state.values.shape,
    error: () =>
      wrapper.find('[data-slot="field-error"]').exists()
        ? wrapper.find('[data-slot="field-error"]').text()
        : null,
  };
}

type Mounted = Awaited<ReturnType<typeof mountShapeInput>>;

/** Draws `geometry` with the polygon tool the way Terra Draw finishes one. */
async function drawShape({ wrapper, draw }: Mounted, geometry: Polygon) {
  const polygon = wrapper
    .findAll("button")
    .find((b) => b.attributes("aria-label") === "Draw a polygon");
  await polygon?.trigger("click");
  const id = draw().put(geometry, "polygon");
  draw().emitFinish(id, "draw");
  await flushPromises();
}

describe("PolygonInput", () => {
  it("flags a 2 vertex polygon with the minVertices message", async () => {
    const mounted = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", minVertices: 3 }),
    );

    await drawShape(mounted, twoVertices);
    await mounted.submit();

    expect(mounted.error()).toBe("Must have at least 3 vertices");
  });

  it("counts a triangle as 3 vertices, not 4", async () => {
    const mounted = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", minVertices: 3, maxVertices: 3 }),
    );

    await drawShape(mounted, triangle);
    await mounted.submit();

    expect(mounted.value()).toEqual(triangle);
    expect(mounted.error()).toBeNull();
  });

  it("flags a polygon over maxVertices after a vertex is added", async () => {
    const mounted = await mountShapeInput(
      () => h(PolygonInput, { source: "shape", maxVertices: 4 }),
      square,
    );
    await mounted.submit();
    expect(mounted.error()).toBeNull();

    const edit = mounted.wrapper
      .findAll("button")
      .find((b) => b.attributes("aria-label") === "Edit");
    await edit?.trigger("click");
    const id = defined(mounted.draw().features[0]?.id);
    mounted.draw().replace(id, pentagon);
    mounted.draw().emitFinish(id, "dragCoordinate", "select");
    await flushPromises();
    await mounted.submit();

    expect(mounted.value()).toEqual(pentagon);
    expect(mounted.error()).toBe("Must have 4 vertices or fewer");
  });

  it("flags a polygon under minAreaM2 and shows the area", async () => {
    const mounted = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", minAreaM2: 1000 }),
    );

    await drawShape(mounted, tiny);
    await mounted.submit();

    expect(mounted.error()).toMatch(/^Area 12\d is below the minimum of 1000$/);
  });

  it("flags a bow-tie only when allowSelfIntersection is false", async () => {
    const lenient = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape" }),
    );
    await drawShape(lenient, bowTie);
    await lenient.submit();
    expect(lenient.value()).toEqual(bowTie);
    expect(lenient.error()).toBeNull();

    lenient.wrapper.unmount();
    mounted.length = 0;
    resetMaps();
    resetDraws();
    const strict = await mountShapeInput(() =>
      h(PolygonInput, { source: "shape", allowSelfIntersection: false }),
    );
    await drawShape(strict, bowTie);
    await strict.submit();
    expect(strict.error()).toBe("Must not cross itself");
  });
});

describe("ShapeInput", () => {
  it("writes an invalid shape to the form and flags it instead of dropping it", async () => {
    const commits: unknown[] = [];
    const mountedInput = await mountShapeInput(() =>
      h(ShapeInput, {
        source: "shape",
        kind: "Polygon",
        minVertices: 3,
        onCommit: (value: unknown) => commits.push(value),
      }),
    );

    await drawShape(mountedInput, twoVertices);
    await mountedInput.submit();

    expect(mountedInput.value()).toEqual(twoVertices);
    expect(commits).toEqual([twoVertices]);
    expect(mountedInput.error()).not.toBeNull();
  });

  it("runs the caller's validate after the built-in limits", async () => {
    const validate = vi.fn(() => "Caller says no");
    const mountedInput = await mountShapeInput(() =>
      h(ShapeInput, {
        source: "shape",
        kind: "Polygon",
        minVertices: 3,
        validate,
      }),
    );

    await drawShape(mountedInput, twoVertices);
    await mountedInput.submit();
    expect(mountedInput.error()).toBe("Must have at least 3 vertices");
    expect(validate).not.toHaveBeenCalled();

    await drawShape(mountedInput, triangle);
    await mountedInput.submit();
    expect(mountedInput.error()).toBe("Caller says no");
    expect(validate).toHaveBeenCalled();
  });
});

describe("required", () => {
  it("still marks the legend when a limit is set next to required()", async () => {
    const mounted = await mountShapeInput(() =>
      h(PolygonInput, {
        source: "shape",
        label: "Area",
        minVertices: 3,
        validate: [required()],
      }),
    );

    expect(mounted.wrapper.find("legend").text()).toBe("Area *");
  });

  it("renders no legend for an empty label", async () => {
    const mounted = await mountShapeInput(() =>
      h(PolygonInput, {
        source: "shape",
        label: "",
        validate: [required()],
      }),
    );

    expect(mounted.wrapper.find("legend").exists()).toBe(false);
  });
});

describe("toolMode", () => {
  it("maps cut to the polygon mode", () => {
    expect(toolMode("cut")).toBe("polygon");
    expect(toolMode("cut", true)).toBe("render");
  });
});
