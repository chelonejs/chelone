// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import sections from "../src/docs/content/_meta";
import mapsMeta from "../src/docs/content/maps/_meta";
import { SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

/**
 * The nine shape fields are `GeoJsonField` under the name of a GeoJSON type
 * (packages/react/src/components/maps/shape-fields.tsx). Each page names its
 * type in backticks, so a page for `Point` never passes on `MultiPoint`.
 */
const shapeFields = [
  { slug: "point-field", component: "PointField", geojson: "Point" },
  {
    slug: "multi-point-field",
    component: "MultiPointField",
    geojson: "MultiPoint",
  },
  {
    slug: "line-string-field",
    component: "LineStringField",
    geojson: "LineString",
  },
  {
    slug: "multi-line-string-field",
    component: "MultiLineStringField",
    geojson: "MultiLineString",
  },
  { slug: "polygon-field", component: "PolygonField", geojson: "Polygon" },
  {
    slug: "multi-polygon-field",
    component: "MultiPolygonField",
    geojson: "MultiPolygon",
  },
  {
    slug: "geometry-collection-field",
    component: "GeometryCollectionField",
    geojson: "GeometryCollection",
  },
  { slug: "feature-field", component: "FeatureField", geojson: "Feature" },
  {
    slug: "feature-collection-field",
    component: "FeatureCollectionField",
    geojson: "FeatureCollection",
  },
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
    shapeFields.map(({ slug }) => slug),
  );
});

it.each(shapeFields)(
  "$component has a row in the stub table importing from @chelone/react/maps",
  ({ component }) => {
    const line = stubLines.find((row) =>
      row.includes(`component: "${component}"`),
    );
    expect(line, `${component} in STUBS`).toBeDefined();
    expect(line).toContain('section: "maps"');
    expect(line).toContain('slug: "');
    expect(line).toContain('importFrom: "@chelone/react/maps"');
  },
);

it.each(shapeFields)(
  "$component has a generated reference page with its props, import and a link to the maps guide",
  ({ slug, component, geojson }) => {
    const mdx = page(slug);

    expect(mdx).toContain(`title: "${component}"`);
    expect(mdx).toContain("{/* generated:gen-component-stubs */}");
    expect(mdx).toContain(`\`${geojson}\``);
    // The nine fields are one component, and each page says so.
    expect(mdx, `${component} is named as GeoJsonField`).toContain(
      "`GeoJsonField`",
    );
    expect(mdx).toContain(`<PropsTable name="${component}" />`);
    expect(mdx).toContain(
      `import { ${component} } from "@chelone/react/maps";`,
    );
    expect(mdx).toContain("](/docs/app-config/maps)");
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);

/** The prop names the page's props table renders, from the typedoc JSON. */
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
  "properties",
]);

it.each(shapeFields)(
  "$component backticks only its own props, so no page suggests a prop that does not exist",
  ({ slug, component }) => {
    const props = propNames(component);
    for (const match of page(slug).matchAll(/`([a-z][\w.]*)`/g)) {
      const root = match[1].split(".")[0];
      expect(
        props.has(root) || GEOJSON_MEMBERS.has(root),
        `${slug}: \`${match[1]}\` is not a prop of ${component}`,
      ).toBe(true);
    }
  },
);

it("every shape field page is exported by the maps entry of both adapters", () => {
  for (const adapter of ["react", "vue"]) {
    const entry = readFileSync(
      new URL(`../../../packages/${adapter}/src/maps.ts`, import.meta.url),
      "utf8",
    );
    for (const { component } of shapeFields) {
      expect(entry, `${component} in @chelone/${adapter}/maps`).toContain(
        component,
      );
    }
  }
});
