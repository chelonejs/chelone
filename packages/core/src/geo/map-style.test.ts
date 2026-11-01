import { describe, expect, it } from "vitest";
import {
  expandTileUrl,
  latLngToLngLat,
  lngLatToLatLng,
  rasterTileStyle,
} from "./map-style";

describe("expandTileUrl", () => {
  it("turns a {s} template into three hosts", () => {
    const urls = expandTileUrl("https://{s}.tiles.example/{z}/{x}/{y}.png");
    expect(urls).toEqual([
      "https://a.tiles.example/{z}/{x}/{y}.png",
      "https://b.tiles.example/{z}/{x}/{y}.png",
      "https://c.tiles.example/{z}/{x}/{y}.png",
    ]);
  });

  it("leaves a template without {s} as one URL", () => {
    const url = "https://tiles.example/{z}/{x}/{y}.png";
    expect(expandTileUrl(url)).toEqual([url]);
  });
});

describe("rasterTileStyle", () => {
  it("puts the attribution on the raster source", () => {
    const style = rasterTileStyle({
      tileUrl: "https://{s}.tiles.example/{z}/{x}/{y}.png",
      attribution: "© Example",
    });
    expect(style.version).toBe(8);
    expect(style.sources.basemap).toEqual({
      type: "raster",
      tiles: [
        "https://a.tiles.example/{z}/{x}/{y}.png",
        "https://b.tiles.example/{z}/{x}/{y}.png",
        "https://c.tiles.example/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© Example",
    });
    expect(style.layers).toEqual([
      { id: "basemap", type: "raster", source: "basemap" },
    ]);
  });

  it("takes maxZoom from the options", () => {
    const style = rasterTileStyle({
      tileUrl: "https://tiles.example/{z}/{x}/{y}.png",
      attribution: "© Example",
      maxZoom: 12,
    });
    expect(style.sources.basemap?.maxzoom).toBe(12);
  });

  it("throws a TypeError for an empty tileUrl and for an empty attribution", () => {
    expect(() => rasterTileStyle({ tileUrl: "", attribution: "x" })).toThrow(
      TypeError,
    );
    expect(() => rasterTileStyle({ tileUrl: "", attribution: "x" })).toThrow(
      /tileUrl/,
    );
    expect(() =>
      rasterTileStyle({ tileUrl: "https://t/{z}", attribution: "" }),
    ).toThrow(TypeError);
    expect(() =>
      rasterTileStyle({ tileUrl: "https://t/{z}", attribution: "" }),
    ).toThrow(/attribution/);
  });
});

describe("latLngToLngLat and lngLatToLatLng", () => {
  it("round-trip", () => {
    expect(latLngToLngLat([48.85, 2.35])).toEqual([2.35, 48.85]);
    expect(lngLatToLatLng([2.35, 48.85])).toEqual([48.85, 2.35]);
    expect(lngLatToLatLng(latLngToLngLat([10, -20]))).toEqual([10, -20]);
  });
});
