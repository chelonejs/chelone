import type { MetaEntry } from "@/docs/types";

// The general pieces come first: the fields and inputs that take the value as
// the record holds it. Each "Shape" category then holds the pages named after a
// GeoJSON type, which are the general one under that name.
export default [
  {
    category: "Fields",
    slugs: ["geo-json-field", "bbox-field", "lat-lng-field"],
  },
  {
    category: "Shape fields",
    slugs: [
      "point-field",
      "multi-point-field",
      "line-string-field",
      "multi-line-string-field",
      "polygon-field",
      "multi-polygon-field",
      "geometry-collection-field",
      "feature-field",
      "feature-collection-field",
    ],
  },
  {
    category: "Inputs",
    slugs: ["shape-input", "bbox-input", "lat-lng-input", "simplify-input"],
  },
  {
    category: "Shape inputs",
    slugs: [
      "point-input",
      "multi-point-input",
      "line-string-input",
      "multi-line-string-input",
      "polygon-input",
      "multi-polygon-input",
      "geometry-collection-input",
      "geo-json-input",
      "feature-input",
      "feature-collection-input",
    ],
  },
  // The pieces of the `maps/osm` entry, which call a geocoding or OpenStreetMap
  // service the app supplies.
  {
    category: "Geocoding and OpenStreetMap",
    slugs: [
      "geocoding-input",
      "map-with-search",
      "reverse-geocode-field",
      "osm-feature-add",
      "osm-feature-subtract",
    ],
  },
] satisfies MetaEntry[];
