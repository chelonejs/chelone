// Plain style objects: core takes no map library and picks no tile server.

/** The slice of a MapLibre style object these helpers build. */
export interface MapStyleSpec {
  version: 8;
  sources: Record<
    string,
    {
      type: "raster";
      tiles: string[];
      tileSize: number;
      maxzoom: number;
      attribution: string;
    }
  >;
  layers: { id: string; type: "raster"; source: string }[];
}

/** A style URL or a style object: the type of the adapters' `mapStyle` input. */
export type MapStyleInput = string | MapStyleSpec;

export interface RasterTileStyleOptions {
  /** `{z}/{x}/{y}` template; `{s}` expands to the hosts `a`, `b` and `c`. */
  tileUrl: string;
  attribution: string;
  /** Defaults to 19. */
  maxZoom?: number;
}

/** MapLibre has no `{s}` support, so a template with one becomes three URLs. */
export function expandTileUrl(url: string): string[] {
  if (!url.includes("{s}")) return [url];
  return ["a", "b", "c"].map((host) => url.replaceAll("{s}", host));
}

export function rasterTileStyle({
  tileUrl,
  attribution,
  maxZoom = 19,
}: RasterTileStyleOptions): MapStyleSpec {
  if (!tileUrl) throw new TypeError("rasterTileStyle: tileUrl is required");
  if (!attribution) {
    throw new TypeError("rasterTileStyle: attribution is required");
  }
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: expandTileUrl(tileUrl),
        tileSize: 256,
        maxzoom: maxZoom,
        attribution,
      },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
  };
}

/** `[lat, lng]` (what components take) to MapLibre's `[lng, lat]`. */
export function latLngToLngLat(
  latLng: readonly [lat: number, lng: number],
): [lng: number, lat: number] {
  return [latLng[1], latLng[0]];
}

/** MapLibre's `[lng, lat]` to `[lat, lng]`. */
export function lngLatToLatLng(
  lngLat: readonly [lng: number, lat: number],
): [lat: number, lng: number] {
  return [lngLat[1], lngLat[0]];
}
