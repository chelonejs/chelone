// A subpath entry, not part of the barrel and not part of `./maps`: the
// add-on imports the optional `terra-draw` and `terra-draw-maplibre-gl-adapter`
// peers, which an app that only shows maps never resolves.
export {
  BBoxInput,
  type BBoxInputProps,
} from "./components/maps-draw/bbox-input";
export {
  DrawToolbar,
  type DrawToolbarProps,
} from "./components/maps-draw/draw-toolbar";
export {
  type CutResult,
  cutFeatures,
  type SimplifyOptions,
  simplifyGeo,
} from "./components/maps-draw/geometry-ops";
export {
  ShapeInput,
  type ShapeInputProps,
} from "./components/maps-draw/shape-input";
export {
  FeatureCollectionInput,
  type FeatureCollectionInputProps,
  FeatureInput,
  type FeatureInputProps,
  GeoJsonInput,
  type GeoJsonInputBaseProps,
  type GeoJsonInputProps,
  GeometryCollectionInput,
  type GeometryShape,
  LineStringInput,
  MultiLineStringInput,
  MultiPointInput,
  MultiPolygonInput,
  PointInput,
  PolygonInput,
  toolsForShapes,
} from "./components/maps-draw/shape-inputs";
export {
  SimplifyInput,
  type SimplifyInputProps,
  type SimplifyQuality,
} from "./components/maps-draw/simplify-input";
export {
  type DrawTool,
  type TerraDrawEdit,
  toolMode,
  type UseTerraDrawOptions,
  type UseTerraDrawResult,
  useTerraDraw,
} from "./components/maps-draw/use-terra-draw";
