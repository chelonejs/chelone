// A subpath entry, not part of the barrel and not part of `./maps`: these
// pieces call a network service, and `MapWithSearch` renders a map, so it needs
// the optional `maplibre-gl` peer. The library names no geocoding service; the
// app passes a provider.
export {
  GeocodingInput,
  type GeocodingInputProps,
} from "./components/maps-osm/geocoding-input";
export {
  MapWithSearch,
  type MapWithSearchProps,
} from "./components/maps-osm/map-with-search";
export {
  type FetchOsmFeaturesOptions,
  fetchOsmFeatures,
  osmToPolygons,
} from "./components/maps-osm/osm-features";
export {
  subtractMask,
  unionAll,
} from "./components/maps-osm/osm-geometry-ops";
export {
  type UseGeocodeOptions,
  useGeocode,
} from "./components/maps-osm/use-geocode";
export {
  type UseOsmFeaturesOptions,
  useOsmFeatures,
} from "./components/maps-osm/use-osm-features";
