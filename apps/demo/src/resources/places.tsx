import {
  Create,
  DataTable,
  Edit,
  List,
  RecordField,
  Show,
  TextInput,
} from "@chelone/react";
import { GeoJsonField, LatLngField } from "@chelone/react/maps";
import {
  BBoxInput,
  LineStringInput,
  PolygonInput,
} from "@chelone/react/maps/draw";
import {
  MapWithSearch,
  OsmFeatureAdd,
  OsmFeatureSubtract,
  ReverseGeocodeField,
} from "@chelone/react/maps/osm";

export function PlaceList() {
  return (
    <List>
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
      <RecordField source="name" />
      <RecordField label="Location">
        <LatLngField latSource="lat" lngSource="lng" />
      </RecordField>
      <RecordField label="Address">
        <ReverseGeocodeField latSource="lat" lngSource="lng" />
      </RecordField>
      <RecordField label="Area">
        <GeoJsonField source="area" />
      </RecordField>
      <RecordField label="Route">
        <GeoJsonField source="route" />
      </RecordField>
    </Show>
  );
}

// The fields are children of Edit/Create, so the shared form is a fragment of
// inputs rather than a wrapper component.
const placeInputs = (
  <>
    <TextInput source="name" />
    <MapWithSearch latSource="lat" lngSource="lng" addressSource="address" />
    <PolygonInput source="area" label="Area" />
    <div className="flex gap-2">
      <OsmFeatureSubtract source="area" presets={["water"]} />
      <OsmFeatureAdd source="area" presets={["buildings"]} />
    </div>
    <LineStringInput source="route" label="Route" snapToRoads />
    <BBoxInput source="bbox" label="Bounding box" />
  </>
);

export function PlaceEdit() {
  return <Edit>{placeInputs}</Edit>;
}

export function PlaceCreate() {
  return <Create>{placeInputs}</Create>;
}
