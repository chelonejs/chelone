/**
 * BBoxField display tests, on the stand-in for `maplibre-gl` in
 * `__fixtures__/fake-maplibre.ts`.
 */

import { fakeDataProvider, rasterTileStyle } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { maps, resetFake } from "./__fixtures__/fake-maplibre";
import { BBoxField } from "./bbox-field";
import { MapsProvider } from "./maps-provider";

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

async function show(record: Record<string, unknown>) {
  const view = render(<BBoxField source="bbox" record={record} />, {
    wrapper,
  });
  await act(async () => {});
  return view;
}

describe("BBoxField", () => {
  it("draws the box as a closed polygon and fits it", async () => {
    await show({ bbox: [10, 20, 14, 26] });

    const [sourceId = ""] = Object.keys(maps[0]?.sources ?? {});
    expect(maps[0]?.sources[sourceId]?.data).toEqual({
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
    expect(maps[0]?.fits[0]?.bounds).toEqual([10, 20, 14, 26]);
  });

  it("shows the empty state for a three-element array and null", async () => {
    for (const bbox of [[10, 20, 14], null]) {
      const { container, unmount } = await show({ bbox });
      expect(
        container.querySelector('[data-slot="geo-json-field-empty"]')
          ?.textContent,
      ).toBe("No geometry available");
      expect(maps).toHaveLength(0);
      unmount();
    }
  });
});
