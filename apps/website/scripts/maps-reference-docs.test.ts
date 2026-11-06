// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import sections from "../src/docs/content/_meta";
import mapsMeta from "../src/docs/content/maps/_meta";
import { SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

/**
 * A maps reference page: its slug, the component it documents, the entry that
 * exports it, the props JSON its table renders, and the backticked names the
 * page must carry so it never reads as a page for a similar component.
 */
interface ReferencePage {
  slug: string;
  component: string;
  importFrom: string;
  propsFrom: string;
  names: string[];
}

/**
 * The general pieces: the fields and inputs that are not named after a GeoJSON
 * type. `LatLngInput` sits under `maps`, not `maps/draw`, since it needs only
 * `maplibre-gl`.
 */
const generalFields = [
  {
    slug: "geo-json-field",
    component: "GeoJsonField",
    importFrom: "@chelone/react/maps",
    names: ["Geometry", "Feature", "FeatureCollection"],
  },
  {
    slug: "bbox-field",
    component: "BBoxField",
    importFrom: "@chelone/react/maps",
    names: ["BBox", "GeoJsonField"],
  },
  {
    slug: "lat-lng-field",
    component: "LatLngField",
    importFrom: "@chelone/react/maps",
    names: ["latSource", "lngSource"],
  },
];

const generalInputs = [
  {
    slug: "shape-input",
    component: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    names: ["kind", "tools", "PointInput", "PolygonInput"],
  },
  {
    slug: "bbox-input",
    component: "BBoxInput",
    importFrom: "@chelone/react/maps/draw",
    names: ["BBox", "ShapeInput", "draw-rectangle"],
  },
  {
    slug: "lat-lng-input",
    component: "LatLngInput",
    importFrom: "@chelone/react/maps",
    names: ["latSource", "lngSource"],
  },
  {
    slug: "simplify-input",
    component: "SimplifyInput",
    importFrom: "@chelone/react/maps/draw",
    names: ["tolerance", "quality"],
  },
];

/**
 * The nine shape fields are `GeoJsonField` under the name of a GeoJSON type
 * (packages/react/src/components/maps/shape-fields.tsx). Each page names its
 * type in backticks, so a page for `Point` never passes on `MultiPoint`.
 */
const shapeFields = [
  {
    slug: "point-field",
    component: "PointField",
    geojson: "Point",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "multi-point-field",
    component: "MultiPointField",
    geojson: "MultiPoint",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "line-string-field",
    component: "LineStringField",
    geojson: "LineString",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "multi-line-string-field",
    component: "MultiLineStringField",
    geojson: "MultiLineString",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "polygon-field",
    component: "PolygonField",
    geojson: "Polygon",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "multi-polygon-field",
    component: "MultiPolygonField",
    geojson: "MultiPolygon",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "geometry-collection-field",
    component: "GeometryCollectionField",
    geojson: "GeometryCollection",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "feature-field",
    component: "FeatureField",
    geojson: "Feature",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
  {
    slug: "feature-collection-field",
    component: "FeatureCollectionField",
    geojson: "FeatureCollection",
    alias: "GeoJsonField",
    importFrom: "@chelone/react/maps",
  },
];

/**
 * The ten shape inputs are `ShapeInput` under the name of a GeoJSON type
 * (packages/react/src/components/maps-draw/shape-inputs.tsx), each from the
 * `maps/draw` entry.
 *
 * `propsFrom` names the props JSON a page renders. It is the component for
 * every page but `LineStringInput`: no entry re-exports `LineStringInputProps`,
 * so typedoc documents no props for it and its page renders the table of the
 * props every shape input shares.
 */
const shapeInputs = [
  {
    slug: "point-input",
    component: "PointInput",
    geojson: "Point",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "PointInput",
  },
  {
    slug: "multi-point-input",
    component: "MultiPointInput",
    geojson: "MultiPoint",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "MultiPointInput",
  },
  {
    slug: "line-string-input",
    component: "LineStringInput",
    geojson: "LineString",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "GeoJsonInputBase",
  },
  {
    slug: "multi-line-string-input",
    component: "MultiLineStringInput",
    geojson: "MultiLineString",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "MultiLineStringInput",
  },
  {
    slug: "polygon-input",
    component: "PolygonInput",
    geojson: "Polygon",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "PolygonInput",
  },
  {
    slug: "multi-polygon-input",
    component: "MultiPolygonInput",
    geojson: "MultiPolygon",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "MultiPolygonInput",
  },
  {
    slug: "geometry-collection-input",
    component: "GeometryCollectionInput",
    geojson: "GeometryCollection",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "GeometryCollectionInput",
  },
  {
    slug: "geo-json-input",
    component: "GeoJsonInput",
    geojson: "GeometryCollection",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "GeoJsonInput",
  },
  {
    slug: "feature-input",
    component: "FeatureInput",
    geojson: "Feature",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "FeatureInput",
  },
  {
    slug: "feature-collection-input",
    component: "FeatureCollectionInput",
    geojson: "FeatureCollection",
    alias: "ShapeInput",
    importFrom: "@chelone/react/maps/draw",
    propsFrom: "FeatureCollectionInput",
  },
];

/**
 * The pieces of the `maps/osm` entry: the geocoding input and field, the search
 * over a map, and the two OpenStreetMap buttons. Each calls a network service
 * the app supplies through `MapsProvider` or a `provider` prop.
 *
 * `OsmFeatureOperator` has no page of its own: it is the button the two named
 * ones are, with `mode` left to the caller.
 */
const geocodingAndOsm = [
  {
    slug: "geocoding-input",
    component: "GeocodingInput",
    importFrom: "@chelone/react/maps/osm",
    names: ["source", "latSource", "lngSource", "bboxSource"],
  },
  {
    slug: "map-with-search",
    component: "MapWithSearch",
    importFrom: "@chelone/react/maps/osm",
    names: ["addressSource", "latSource", "lngSource", "maplibre-gl"],
  },
  {
    slug: "reverse-geocode-field",
    component: "ReverseGeocodeField",
    importFrom: "@chelone/react/maps/osm",
    names: ["format", "latSource", "lngSource", "street", "city"],
  },
  {
    slug: "osm-feature-add",
    component: "OsmFeatureAdd",
    importFrom: "@chelone/react/maps/osm",
    names: ["OsmFeatureOperator", "presets", "tags", "add"],
  },
  {
    slug: "osm-feature-subtract",
    component: "OsmFeatureSubtract",
    importFrom: "@chelone/react/maps/osm",
    names: ["OsmFeatureOperator", "presets", "tags", "subtract"],
  },
];

/** Every maps reference page, in the order `maps/_meta.ts` lists its categories. */
const referencePages: ReferencePage[] = [
  ...generalFields.map((page) => ({ ...page, propsFrom: page.component })),
  ...shapeFields.map((page) => ({
    ...page,
    propsFrom: page.component,
    names: [page.geojson, page.alias],
  })),
  ...generalInputs.map((page) => ({ ...page, propsFrom: page.component })),
  ...shapeInputs.map((page) => ({
    ...page,
    names: [page.geojson, page.alias],
  })),
  ...geocodingAndOsm.map((page) => ({ ...page, propsFrom: page.component })),
];

const page = (slug: string) =>
  readFileSync(
    new URL(`../src/docs/content/maps/${slug}/index.mdx`, import.meta.url),
    "utf8",
  );

const stubLines = readFileSync(
  new URL("./gen-component-stubs.mjs", import.meta.url),
  "utf8",
).split("\n");

it("Maps has an icon and blurb for section navigation and cards", () => {
  expect(SECTION_META.maps?.icon).toBeDefined();
  expect(SECTION_META.maps?.blurb).toMatch(/\S/);
});

it("Maps follows Realtime and lists every maps reference page", () => {
  const directories = sections.map((section) => section.dir);
  const realtimeIndex = directories.indexOf("realtime");
  expect(directories.slice(realtimeIndex, realtimeIndex + 2)).toEqual([
    "realtime",
    "maps",
  ]);
  expect(mapsMeta.flatMap((entry) => entry.slugs)).toEqual(
    referencePages.map(({ slug }) => slug),
  );
});

it.each(referencePages)(
  "$component has a row in the stub table importing from $importFrom",
  ({ component, importFrom }) => {
    const line = stubLines.find((row) =>
      row.includes(`component: "${component}"`),
    );
    expect(line, `${component} in STUBS`).toBeDefined();
    expect(line).toContain('section: "maps"');
    expect(line).toContain('slug: "');
    expect(line).toContain(`importFrom: "${importFrom}"`);
  },
);

it.each(referencePages)(
  "$component has a generated reference page with its props, import and a link to the maps guide",
  ({ slug, component, names, importFrom, propsFrom }) => {
    const mdx = page(slug);

    expect(mdx).toContain(`title: "${component}"`);
    expect(mdx).toContain("{/* generated:gen-component-stubs */}");
    for (const name of names) {
      expect(mdx, `${slug} names \`${name}\``).toContain(`\`${name}\``);
    }
    expect(mdx).toContain(`<PropsTable name="${propsFrom}" />`);
    expect(mdx).toContain(`import { ${component} } from "${importFrom}";`);
    expect(mdx).toContain("](/docs/app-config/maps)");
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);

/** The prop names a page's props table renders, from the typedoc JSON. */
function propNames(component: string): Set<string> {
  const json: { props?: { name: string }[] } = JSON.parse(
    readFileSync(
      new URL(`../src/docs/content/props/${component}.json`, import.meta.url),
    ),
    "utf8",
  );
  return new Set((json.props ?? []).map((prop) => prop.name));
}

// A page names these as the record's GeoJSON, never as props of the field.
const GEOJSON_MEMBERS = new Set([
  "coordinates",
  "features",
  "geometries",
  "geometry",
  "id",
  "properties",
]);

// Toolbar buttons, which are values of the `tools` prop and not props.
const TOOL_NAMES = new Set([
  "cut",
  "delete",
  "draw-circle",
  "draw-line",
  "draw-point",
  "draw-polygon",
  "draw-rectangle",
  "edit",
  "move",
]);

// The prop each named piece sets for the caller: `kind` on `ShapeInput`, `mode`
// on `OsmFeatureOperator`.
const SET_FOR_THE_CALLER = new Set(["kind", "mode"]);

// Values of a prop, which its props table shows as a union rather than as rows.
const PROP_VALUES = new Map([
  ["ReverseGeocodeField", ["full", "street", "city"]],
  ["OsmFeatureAdd", ["add"]],
  ["OsmFeatureSubtract", ["subtract"]],
]);

// Optional peer packages a page names as something to install, not as props.
const PEER_PACKAGES = new Set(["maplibre-gl"]);

/** Props a page names that its props table cannot hold; see `propsFrom`. */
const OUTSIDE_ITS_TABLE = new Map([
  ["LineStringInput", ["snapToRoads"]],
  // `BBoxInputProps` leaves out `kind` and `tools` because `BBoxInput` sets
  // them; only `tools` is named here, as `kind` is allowed above.
  ["BBoxInput", ["tools"]],
]);

it.each(referencePages)(
  "$component backticks only its own props, so no page suggests a prop that does not exist",
  ({ slug, component, propsFrom }) => {
    const props = propNames(propsFrom);
    const own = new Set([
      ...(OUTSIDE_ITS_TABLE.get(component) ?? []),
      ...(PROP_VALUES.get(component) ?? []),
    ]);
    for (const match of page(slug).matchAll(/`([a-z][\w.-]*)`/g)) {
      const root = match[1].split(".")[0];
      expect(
        props.has(root) ||
          own.has(root) ||
          GEOJSON_MEMBERS.has(root) ||
          TOOL_NAMES.has(root) ||
          PEER_PACKAGES.has(root) ||
          SET_FOR_THE_CALLER.has(root),
        `${slug}: \`${match[1]}\` is not a prop of ${component}`,
      ).toBe(true);
    }
  },
);

it.each(referencePages)(
  "$component is exported by the $importFrom entry of both adapters",
  ({ component, importFrom }) => {
    // `@chelone/react/maps/draw` is exported by `src/maps-draw.ts`.
    const entry = importFrom.split("/").slice(2).join("-");
    for (const adapter of ["react", "vue"]) {
      const source = readFileSync(
        new URL(
          `../../../packages/${adapter}/src/${entry}.ts`,
          import.meta.url,
        ),
        "utf8",
      );
      expect(source, `${component} in @chelone/${adapter}/${entry}`).toContain(
        component,
      );
    }
  },
);
