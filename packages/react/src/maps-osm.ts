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
  OsmFeatureAdd,
  type OsmFeatureAddProps,
  OsmFeatureOperator,
  type OsmFeatureOperatorProps,
  OsmFeatureSubtract,
  type OsmFeatureSubtractProps,
} from "./components/maps-osm/osm-feature-operator";
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
  ReverseGeocodeField,
  type ReverseGeocodeFieldProps,
} from "./components/maps-osm/reverse-geocode-field";
export {
  type UseGeocodeOptions,
  useGeocode,
} from "./components/maps-osm/use-geocode";
export {
  type UseOsmFeaturesOptions,
  useOsmFeatures,
} from "./components/maps-osm/use-osm-features";
export {
  type UseReverseGeocodeOptions,
  useReverseGeocode,
} from "./components/maps-osm/use-reverse-geocode";
