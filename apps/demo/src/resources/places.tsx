import type { Place } from "@chelone/demo-data";
import {
  Create,
  DataTable,
  Edit,
  List,
  RecordField,
  SaveButton,
  Show,
  TextInput,
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

// One marker per place on the current page. The canvas reads its centre at
// mount, so it waits for the first page of records.
function PlacesMap() {
  // `useListContext` defaults to a bare `ResourceRecord`; naming `Place` is what
  // lets the map read `lat`/`lng` off a record.
  const { data } = useListContext<Place>();
  const points = (data ?? []).flatMap((record) => {
    const { id, lat, lng } = record;
    return typeof lat === "number" && typeof lng === "number"
      ? [{ id, position: [lat, lng] as const }]
      : [];
  });
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
    <List>
      <PlacesMap />
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="address" />
      </DataTable>
    </List>
  );
}

export function PlaceShow() {
  return (
    <Show>
      <div className="flex flex-col gap-4 max-w-xl">
        <RecordField source="name" />
        <RecordField label="Location">
          <LatLngField latSource="lat" lngSource="lng" />
        </RecordField>
        <RecordField label="Address">
          <ReverseGeocodeField latSource="lat" lngSource="lng" />
        </RecordField>
        {/* The `data-field` attributes let a showcase shot tell the four
            `geo-json-field` maps apart. */}
        <RecordField label="Delivery zone" data-field="zone">
          <PolygonField source="zone" />
        </RecordField>
        <RecordField label="Bounding box" data-field="bbox">
          <BBoxField source="bbox" />
        </RecordField>
        <RecordField label="Area" data-field="area">
          <GeoJsonField source="area" />
        </RecordField>
        <RecordField label="Route" data-field="route">
          <GeoJsonField source="route" />
        </RecordField>
      </div>
    </Show>
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
        <ShapeInput source="zone" kind="Polygon" label="Delivery zone" />
      </div>
      {/* Draw the zone above, then thin it here: a drawn value becomes the
        original the slider simplifies from. A zone spans about a hundredth of
        a degree, so the slider is scaled to it and starts at 0, which leaves
        the zone as it was until moved. */}
      <SimplifyInput
        source="zone"
        label="Simplify the delivery zone"
        tolerance={0}
        maxTolerance={0.002}
        step={0.0001}
      />
      <div data-field="zone-water">
        <OsmFeatureOperator
          source="zone"
          mode="subtract"
          presets={["water"]}
          label="Remove water from the zone"
        />
      </div>
      <PolygonInput source="area" label="Area" />
      <div className="flex gap-2">
        <OsmFeatureSubtract source="area" presets={["water"]} />
        <OsmFeatureAdd source="area" presets={["buildings"]} />
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
    <Edit>
      <PlaceForm>
        <TextInput source="name" />
        <MapWithSearch
          latSource="lat"
          lngSource="lng"
          addressSource="address"
        />
      </PlaceForm>
    </Edit>
  );
}

// A new place starts from an address: the search fills the address, the
// coordinates and the box, and the pin below fine-tunes them.
export function PlaceCreate() {
  return (
    <Create>
      <PlaceForm creating>
        <TextInput source="name" />
        <GeocodingInput
          source="address"
          latSource="lat"
          lngSource="lng"
          bboxSource="bbox"
        />
        <LatLngInput latSource="lat" lngSource="lng" />
      </PlaceForm>
    </Create>
  );
}
