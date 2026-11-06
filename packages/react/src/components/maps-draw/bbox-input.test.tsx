/**
 * BBoxInput tests. `maplibre-gl` and `terra-draw` are the stand-ins in the
 * `__fixtures__` folders; see shape-inputs.test.tsx.
 */

import { isGeoGeometry } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFake as resetMaps } from "../maps/__fixtures__/fake-maplibre";
import { resetFake as resetDraws } from "./__fixtures__/fake-terra-draw";
import {
  mountShapeInput,
  storedValue,
  toolbarNames,
} from "./__fixtures__/mount-shape-input";
import { BBoxInput } from "./bbox-input";

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

/** A rectangle polygon from west, south, east, north. */
const rect = (w: number, s: number, e: number, n: number) => ({
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

describe("BBoxInput", () => {
  it("stores [west, south, east, north] for a drawn rectangle", async () => {
    const { draw } = await mountShapeInput(
      <BBoxInput source="shape" label="Extent" />,
    );
    expect(toolbarNames()).toEqual([
      "Draw a rectangle",
      "Edit",
      "Move",
      "Delete",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Draw a rectangle" }));
    await act(async () => {
      const id = draw().put(rect(-2, 10, 6, 14), "rectangle");
      draw().emitFinish(id, "draw", "rectangle");
    });

    expect(storedValue()).toEqual([-2, 10, 6, 14]);
  });

  it("hydrates a stored bbox as one rectangle", async () => {
    const { draw } = await mountShapeInput(
      <BBoxInput source="shape" label="Extent" />,
      [-2, 10, 6, 14],
    );

    expect(draw().added).toHaveLength(1);
    const added = draw().added[0] ?? [];
    expect(added).toHaveLength(1);
    const geometry = defined(added[0]).geometry;
    if (!isGeoGeometry(geometry) || geometry.type !== "Polygon") {
      throw new Error("Expected a rectangle Polygon");
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
    const { draw } = await mountShapeInput(
      <BBoxInput source="shape" />,
      [0, 0, 1, 1],
    );

    fireEvent.click(screen.getByRole("button", { name: "Draw a rectangle" }));
    await act(async () => {
      const id = draw().put(rect(5, 5, 7, 8), "rectangle");
      draw().emitFinish(id, "draw", "rectangle");
    });

    expect(storedValue()).toEqual([5, 5, 7, 8]);
    expect(draw().features).toHaveLength(1);
  });

  it("locks the width over height ratio and redraws the locked rectangle", async () => {
    const { draw } = await mountShapeInput(
      <BBoxInput source="shape" aspectRatio={2} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Draw a rectangle" }));
    // 4 wide and 4 high: grows to 8 wide around the centre, never shrinks.
    await act(async () => {
      const id = draw().put(rect(0, 0, 4, 4), "rectangle");
      draw().emitFinish(id, "draw", "rectangle");
    });

    expect(storedValue()).toEqual([-2, 0, 6, 4]);
    const shown = draw().getSnapshot();
    expect(shown).toHaveLength(1);
    const geometry = defined(shown[0]).geometry;
    if (!isGeoGeometry(geometry) || geometry.type !== "Polygon") {
      throw new Error("Expected a rectangle Polygon");
    }
    const ring = defined(geometry.coordinates[0]);
    const xs = ring.map((c) => defined(c[0]));
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-2, 6]);
  });
});
