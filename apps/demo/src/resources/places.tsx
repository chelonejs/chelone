/**
 * The places demo, built from `createResourceComponents("places")`: every
 * `source` named here is checked against `placeSchema`, which `./index.ts`
 * registers for `places`. A typo is a compile error, and the Edit/Create forms
 * validate against the schema with no per-input `validate` props.
 *
 * The map add-ons are not factory members — the import fence keeps them out of
 * the main entry — so each generic one names `PlaceRecord` and gets the same
 * check. `LineStringInput`, `PolygonInput` and `BBoxInput` take a plain
 * `source`: their props are not generic over a record yet.
 */
import type { Place } from "@chelone/demo-data";
import {
  createResourceComponents,
  DataTable,
  SaveButton,
  Toolbar,
  useListContext,
} from "@chelone/react";
import {
  BBoxField,
  GeoJsonField,
  LatLngField,
  LatLngInput,
  MapCanvas,
  MapMarker,
  PolygonField,
} from "@chelone/react/maps";
import {
  BBoxInput,
  LineStringInput,
  PolygonInput,
  ShapeInput,
  SimplifyInput,
} from "@chelone/react/maps/draw";
import {
  GeocodingInput,
  MapWithSearch,
  OsmFeatureAdd,
  OsmFeatureOperator,
  OsmFeatureSubtract,
  ReverseGeocodeField,
} from "@chelone/react/maps/osm";
import type { ReactNode } from "react";
import { z } from "zod";

/** A closed GeoJSON polygon. */
const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.array(z.number()))),
});

/** A GeoJSON multipolygon. */
const multiPolygonSchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(z.array(z.array(z.number())))),
});

/** What an area field holds: what was drawn, or what an OSM add or subtract left behind. */
const areaSchema = z.union([polygonSchema, multiPolygonSchema]);

/** The record the views read and the forms validate against. */
export const placeSchema = z.object({
  id: z.number().optional(),
  // Each message covers both ways an input fails: cleared (the type error) and
  // out of range or empty (the check).
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  address: z
    .string({ error: "Address is required" })
    .min(1, "Address is required"),
  lat: z
    .number({ error: "Latitude is required" })
    .min(-90, "Latitude must be at least -90")
    .max(90, "Latitude must be at most 90"),
  lng: z
    .number({ error: "Longitude is required" })
    .min(-180, "Longitude must be at least -180")
    .max(180, "Longitude must be at most 180"),
  /**
   * The shapes are optional and nullable. Optional because a place exists
   * before any of them is drawn; nullable because the inputs write `null` for
   * a shape that is no longer there: `ShapeInput` for one the user deletes,
   * `OsmFeatureOperator` for one an add or subtract left nothing of, and
   * `GeocodingInput` for a box an earlier pick no longer fits.
   */
  area: areaSchema.nullable().optional(),
  zone: areaSchema.nullable().optional(),
  route: z
    .object({
      type: z.literal("LineString"),
      coordinates: z.array(z.array(z.number())),
    })
    .nullable()
    .optional(),
  /** `[west, south, east, north]`. */
  bbox: z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .nullable()
    .optional(),
});

/** The place record every view here reads, which `./index.ts` registers for `places`. */
export type PlaceRecord = z.output<typeof placeSchema>;

const places = createResourceComponents("places");

// One marker per place on the current page. The canvas reads its centre at
// mount, so it waits for the first page of records.
function PlacesMap() {
  // `useListContext` defaults to a bare `ResourceRecord`, whose `id` is the only
  // key it declares, so the map names the seed row it reads.
  const { data } = useListContext<Place>();
  const points = (data ?? []).map((record) => ({
    id: record.id,
    position: [record.lat, record.lng] as const,
  }));
  const first = points[0];
  if (!first) return null;
  return (
    <MapCanvas center={first.position} zoom={11} className="mb-4">
      {points.map(({ id, position }) => (
        <MapMarker key={id} position={position} />
      ))}
    </MapCanvas>
  );
}

export function PlaceList() {
  return (
    <places.List>
      <PlacesMap />
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="address" />
      </DataTable>
    </places.List>
  );
}

export function PlaceShow() {
  return (
    <places.Show>
      <div className="flex flex-col gap-4 max-w-xl">
        <places.RecordField source="name" />
        <places.RecordField label="Location">
          <LatLngField<PlaceRecord> latSource="lat" lngSource="lng" />
        </places.RecordField>
        <places.RecordField label="Address">
          <ReverseGeocodeField<PlaceRecord> latSource="lat" lngSource="lng" />
        </places.RecordField>
        {/* The `data-field` attributes let a showcase shot tell the four
            `geo-json-field` maps apart. */}
        <places.RecordField label="Delivery zone" data-field="zone">
          <PolygonField<PlaceRecord> source="zone" />
        </places.RecordField>
        <places.RecordField label="Bounding box" data-field="bbox">
          <BBoxField<PlaceRecord> source="bbox" />
        </places.RecordField>
        <places.RecordField label="Area" data-field="area">
          <GeoJsonField<PlaceRecord> source="area" />
        </places.RecordField>
        <places.RecordField label="Route" data-field="route">
          <GeoJsonField<PlaceRecord> source="route" />
        </places.RecordField>
      </div>
    </places.Show>
  );
}

/**
 * The place form, shared by Edit and Create: `children` find the place, then
 * the delivery zone is drawn and thinned, with the shapes around it. The
 * `data-field` attributes let a showcase shot tell the inputs apart, since
 * `bbox-input` and `shape-input` both render a `shape-input` and the
 * `osm-feature-*` buttons all render an `osm-feature-operator`.
 */
function PlaceForm({
  children,
  creating = false,
}: {
  children: ReactNode;
  creating?: boolean;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      {children}
      <div data-field="zone">
        <ShapeInput<PlaceRecord>
          source="zone"
          kind="Polygon"
          label="Delivery zone"
        />
      </div>
      {/* Draw the zone above, then thin it here: a drawn value becomes the
        original the slider simplifies from. A zone spans about a hundredth of
        a degree, so the slider is scaled to it and starts at 0, which leaves
        the zone as it was until moved. */}
      <SimplifyInput<PlaceRecord>
        source="zone"
        label="Simplify the delivery zone"
        tolerance={0}
        maxTolerance={0.002}
        step={0.0001}
      />
      <div data-field="zone-water">
        <OsmFeatureOperator<PlaceRecord>
          source="zone"
          mode="subtract"
          presets={["water"]}
          label="Remove water from the zone"
        />
      </div>
      <PolygonInput source="area" label="Area" />
      <div className="flex gap-2">
        <OsmFeatureSubtract<PlaceRecord> source="area" presets={["water"]} />
        <OsmFeatureAdd<PlaceRecord> source="area" presets={["buildings"]} />
      </div>
      <LineStringInput source="route" label="Route" snapToRoads />
      <div data-field="bbox">
        <BBoxInput source="bbox" label="Bounding box" />
      </div>
      <Toolbar>{creating ? <SaveButton /> : undefined}</Toolbar>
    </div>
  );
}

export function PlaceEdit() {
  return (
    <places.Edit>
      <PlaceForm>
        <places.TextInput source="name" />
        <MapWithSearch<PlaceRecord>
          latSource="lat"
          lngSource="lng"
          addressSource="address"
        />
      </PlaceForm>
    </places.Edit>
  );
}

// A new place starts from an address: the search fills the address, the
// coordinates and the box, and the pin below fine-tunes them.
export function PlaceCreate() {
  return (
    <places.Create>
      <PlaceForm creating>
        <places.TextInput source="name" />
        <GeocodingInput<PlaceRecord>
          source="address"
          latSource="lat"
          lngSource="lng"
          bboxSource="bbox"
        />
        <LatLngInput<PlaceRecord> latSource="lat" lngSource="lng" />
      </PlaceForm>
    </places.Create>
  );
}
