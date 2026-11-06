/**
 * The limits of a shape input: `minVertices`, `maxVertices`, `minAreaM2` and
 * `allowSelfIntersection` add validators that flag the field. The drawn shape
 * is still written to the form. Terra Draw is the fake in `__fixtures__`; a
 * test plays its part on the instance and reads the form value and the alert.
 */

import { defined } from "@chelone/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { Polygon } from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFake as resetMaps } from "../maps/__fixtures__/fake-maplibre";
import {
  type FakeFeature,
  resetFake as resetDraws,
} from "./__fixtures__/fake-terra-draw";
import { mountShapeInput, storedValue } from "./__fixtures__/mount-shape-input";
import { ShapeInput } from "./shape-input";
import { PolygonInput } from "./shape-inputs";

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

type Mounted = Awaited<ReturnType<typeof mountShapeInput>>;

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

/** Draws `geometry` with the polygon tool the way Terra Draw finishes one. */
async function drawShape({ draw }: Mounted, geometry: FakeFeature["geometry"]) {
  fireEvent.click(screen.getByRole("button", { name: "Draw a polygon" }));
  await act(async () => {
    const id = draw().put(geometry, "polygon");
    draw().emitFinish(id, "draw");
  });
}

/** The form validates on submit, then again on every change. */
const submit = (mounted: Mounted) =>
  act(async () => {
    await mounted.form().submit();
  });

const alertText = () => screen.queryByRole("alert")?.textContent ?? null;

describe("PolygonInput", () => {
  it("flags a 2 vertex polygon with the minVertices message", async () => {
    const mounted = await mountShapeInput(
      <PolygonInput source="shape" minVertices={3} />,
    );

    await drawShape(mounted, twoVertices);
    await submit(mounted);

    expect(alertText()).toBe("Must have at least 3 vertices");
  });

  it("counts a triangle as 3 vertices, not 4", async () => {
    const mounted = await mountShapeInput(
      <PolygonInput source="shape" minVertices={3} maxVertices={3} />,
    );

    await drawShape(mounted, triangle);
    await submit(mounted);

    expect(storedValue()).toEqual(triangle);
    expect(alertText()).toBeNull();
  });

  it("flags a polygon over maxVertices after a vertex is added", async () => {
    const mounted = await mountShapeInput(
      <PolygonInput source="shape" maxVertices={4} />,
      square,
    );
    expect(alertText()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => {
      const { draw } = mounted;
      const id = defined(draw().features[0]?.id);
      draw().replace(id, pentagon);
      draw().emitFinish(id, "dragCoordinate", "select");
    });

    await submit(mounted);

    expect(storedValue()).toEqual(pentagon);
    expect(alertText()).toBe("Must have 4 vertices or fewer");
  });

  it("flags a polygon under minAreaM2 and shows the area", async () => {
    const mounted = await mountShapeInput(
      <PolygonInput source="shape" minAreaM2={1000} />,
    );

    await drawShape(mounted, tiny);
    await submit(mounted);

    expect(alertText()).toMatch(/^Area 12\d is below the minimum of 1000$/);
  });

  it("flags a bow-tie only when allowSelfIntersection is false", async () => {
    const lenient = await mountShapeInput(<PolygonInput source="shape" />);
    await drawShape(lenient, bowTie);
    await submit(lenient);
    expect(storedValue()).toEqual(bowTie);
    expect(alertText()).toBeNull();

    cleanup();
    resetMaps();
    resetDraws();
    const strict = await mountShapeInput(
      <PolygonInput source="shape" allowSelfIntersection={false} />,
    );
    await drawShape(strict, bowTie);
    await submit(strict);
    expect(alertText()).toBe("Must not cross itself");
  });
});

describe("ShapeInput", () => {
  it("writes an invalid shape to the form and flags it instead of dropping it", async () => {
    const onCommit = vi.fn();
    const mounted = await mountShapeInput(
      <ShapeInput
        source="shape"
        kind="Polygon"
        minVertices={3}
        onCommit={onCommit}
      />,
    );

    await drawShape(mounted, twoVertices);
    await submit(mounted);

    expect(storedValue()).toEqual(twoVertices);
    expect(onCommit).toHaveBeenCalledWith(twoVertices);
    expect(alertText()).not.toBeNull();
  });

  it("runs the caller's validate after the built-in limits", async () => {
    const validate = vi.fn(() => "Caller says no");
    const mounted = await mountShapeInput(
      <ShapeInput
        source="shape"
        kind="Polygon"
        minVertices={3}
        validate={validate}
      />,
    );

    await drawShape(mounted, twoVertices);
    await submit(mounted);
    expect(alertText()).toBe("Must have at least 3 vertices");
    expect(validate).not.toHaveBeenCalled();

    await drawShape(mounted, triangle);
    await submit(mounted);
    expect(alertText()).toBe("Caller says no");
    expect(validate).toHaveBeenCalled();
  });
});
