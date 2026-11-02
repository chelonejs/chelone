// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock(
  "maplibre-gl",
  () => import("./components/maps/__fixtures__/fake-maplibre"),
);

describe("the maps entry", () => {
  it("exports LatLngInput", async () => {
    const entry = await import("./maps");
    expect(entry.LatLngInput).toBeTypeOf("function");
  });
});
