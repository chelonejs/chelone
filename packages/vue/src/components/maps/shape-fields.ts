import GeoJsonField from "./geo-json-field.vue";

// Shadmin had one field per GeoJSON type, all doing the same thing. The names
// stay so a migrating app changes no import.
export const PointField = GeoJsonField;
export const MultiPointField = GeoJsonField;
export const LineStringField = GeoJsonField;
export const MultiLineStringField = GeoJsonField;
export const PolygonField = GeoJsonField;
export const MultiPolygonField = GeoJsonField;
export const GeometryCollectionField = GeoJsonField;
export const FeatureField = GeoJsonField;
export const FeatureCollectionField = GeoJsonField;
