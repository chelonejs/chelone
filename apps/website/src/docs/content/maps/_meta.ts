import type { MetaEntry } from "@/docs/types";

export default [
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
] satisfies MetaEntry[];
