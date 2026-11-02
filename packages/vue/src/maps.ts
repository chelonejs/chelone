// A subpath entry, not part of the barrel: the add-on imports the optional
// `maplibre-gl` peer, which the main entry must load without. It names no
// Terra Draw or OpenStreetMap piece; those ship from `./maps/draw` and
// `./maps/osm`.
export {
  default as LatLngField,
  type LatLngFieldProps,
} from "./components/maps/lat-lng-field.vue";
export {
  default as LatLngInput,
  type LatLngInputProps,
} from "./components/maps/lat-lng-input.vue";
export {
  default as MapCanvas,
  type MapCanvasProps,
} from "./components/maps/map-canvas.vue";
export {
  MapMarker,
  type MapMarkerOptions,
  type MapMarkerProps,
  type MapsConfig,
  MapsProvider,
  type MapsProviderProps,
  useMap,
  useMapMarker,
  useMapsConfig,
} from "./components/maps/use-map";
