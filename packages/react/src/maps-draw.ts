// A subpath entry, not part of the barrel and not part of `./maps`: the
// add-on imports the optional `terra-draw` and `terra-draw-maplibre-gl-adapter`
// peers, which an app that only shows maps never resolves.
export {
  DrawToolbar,
  type DrawToolbarProps,
} from "./components/maps-draw/draw-toolbar";
export {
  ShapeInput,
  type ShapeInputProps,
} from "./components/maps-draw/shape-input";
export {
  type DrawTool,
  type TerraDrawEdit,
  toolMode,
  type UseTerraDrawOptions,
  type UseTerraDrawResult,
  useTerraDraw,
} from "./components/maps-draw/use-terra-draw";
