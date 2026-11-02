import {
  asFeatureCollection,
  type GeoFeatureCollection,
  type GeoJsonValue,
  geoBounds,
  isGeoJsonValue,
  type MapStyleInput,
  type ShapeStyle,
  shapeLayerSpecs,
} from "@chelone/core";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import { MapCanvas, useMap } from "./map-canvas";

/** What every GeoJSON map shows besides the data: the framing and the canvas. */
export interface GeoJsonViewProps {
  /** Partial over `DEFAULT_SHAPE_STYLE`. */
  shapeStyle?: ShapeStyle;
  /** Frame the map around the data. Defaults to true. */
  fitBounds?: boolean;
  /** Pixels kept free around the fitted box. Defaults to 20. */
  fitPadding?: number;
  /** The highest zoom a fit may reach, which also sets a single Point's zoom. Defaults to 18. */
  maxFitZoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Zoom with the mouse wheel. Defaults to false so the page still scrolls. */
  scrollZoom?: boolean;
  className?: string;
}

export interface GeoJsonFieldProps extends GeoJsonViewProps {
  /** The record property holding the GeoJSON value. */
  source: string;
  /** Defaults to the ambient record. */
  record?: Record<string, unknown>;
  /** Used when the property is `undefined`. */
  defaultValue?: unknown;
  /** Replaces the translation of `chelone.map.no_geometry`. */
  emptyText?: string;
}

/**
 * Keeps one GeoJSON source and its fill, line and point layers on `map`.
 * `data` goes to `setData`; a changed `style` replaces the layers; unmounting
 * removes both.
 */
export function useGeoJsonSource(
  map: MapLibreMap,
  sourceId: string,
  data: GeoFeatureCollection,
  style: ShapeStyle,
): void {
  const specs = shapeLayerSpecs(sourceId, style);
  const specsKey = JSON.stringify(specs);
  const latest = useRef({ data, specs, specsKey });
  latest.current = { data, specs, specsKey };
  const applied = useRef({ data, specsKey });

  useEffect(() => {
    const now = latest.current;
    // MapLibre types a feature's geometry as non-null once `@types/geojson` resolves.
    map.addSource(sourceId, { type: "geojson", data: now.data as never });
    for (const spec of now.specs) map.addLayer(spec as never);
    applied.current = { data: now.data, specsKey: now.specsKey };
    const ids = now.specs.map((spec) => spec.id);
    return () => {
      // The canvas can remove the map first, and MapLibre throws on a removed one.
      try {
        for (const id of ids) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [map, sourceId]);

  useEffect(() => {
    if (applied.current.data === data) return;
    applied.current.data = data;
    (map.getSource(sourceId) as GeoJSONSourceLike | undefined)?.setData(data);
  }, [map, sourceId, data]);

  useEffect(() => {
    if (applied.current.specsKey === specsKey) return;
    applied.current.specsKey = specsKey;
    for (const spec of latest.current.specs) {
      if (map.getLayer(spec.id)) map.removeLayer(spec.id);
      map.addLayer(spec as never);
    }
  }, [map, specsKey]);
}

interface GeoJSONSourceLike {
  setData(data: GeoFeatureCollection): unknown;
}

interface LayersProps extends GeoJsonViewProps {
  data: GeoFeatureCollection;
  value: GeoJsonValue;
}

function GeoJsonLayers({
  data,
  value,
  shapeStyle,
  fitBounds = true,
  fitPadding = 20,
  maxFitZoom = 18,
}: LayersProps) {
  const map = useMap();
  const sourceId = `geo-json-${useId()}`;
  useGeoJsonSource(map, sourceId, data, shapeStyle ?? {});

  const box = useMemo(() => geoBounds(value), [value]);
  // The box as text, so a new object with the same corners does not refit.
  const boxKey = box ? box.join(",") : "";
  const latest = useRef({ box, fitPadding, maxFitZoom });
  latest.current = { box, fitPadding, maxFitZoom };

  // biome-ignore lint/correctness/useExhaustiveDependencies: boxKey stands for the box
  useEffect(() => {
    const now = latest.current;
    if (!fitBounds || !now.box) return;
    map.fitBounds(now.box, {
      padding: now.fitPadding,
      maxZoom: now.maxFitZoom,
      duration: 0,
    });
  }, [map, fitBounds, boxKey]);

  return null;
}

/**
 * A map showing a Geometry, Feature or FeatureCollection, framed to fit it.
 * `GeoJsonField` and the drawing inputs' read-only state use it.
 *
 * @example
 * <GeoJsonView data={{ type: "Point", coordinates: [2.35, 48.85] }} />
 */
export function GeoJsonView({
  data,
  height,
  mapStyle,
  scrollZoom = false,
  className,
  ...layers
}: GeoJsonViewProps & { data: GeoJsonValue }) {
  const collection = useMemo(() => asFeatureCollection(data), [data]);
  return (
    <MapCanvas
      height={height}
      mapStyle={mapStyle}
      scrollZoom={scrollZoom}
      className={className}
    >
      <GeoJsonLayers data={collection} value={data} {...layers} />
    </MapCanvas>
  );
}

type FieldBodyProps = Omit<
  GeoJsonFieldProps,
  "source" | "record" | "defaultValue"
> & { value: unknown };

/** Shows `value` on a map, or the empty panel when it is not GeoJSON. */
export function GeoJsonFieldBody({
  value,
  emptyText,
  className,
  height,
  ...view
}: FieldBodyProps) {
  const translate = useTranslate();
  if (!isGeoJsonValue(value)) {
    return (
      <div
        data-slot="geo-json-field-empty"
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground",
          className,
        )}
        style={{ height: height ?? 300 }}
      >
        {emptyText ??
          translate("chelone.map.no_geometry", {
            _: "No geometry available",
          })}
      </div>
    );
  }
  return (
    <div data-slot="geo-json-field" className={className}>
      <GeoJsonView data={value} height={height} {...view} />
    </div>
  );
}

/**
 * Shows a GeoJSON value from a record on a map. Null, a string, a number or a
 * malformed object shows a text panel in its place. A string holding JSON text
 * is not parsed: parse it in a `transform`.
 *
 * The named fields (`PointField`, `PolygonField`, ...) are this component.
 *
 * @example
 * <GeoJsonField source="geometry" />
 */
export function GeoJsonField({
  source,
  record,
  defaultValue,
  ...body
}: GeoJsonFieldProps) {
  const value = useFieldValue({ source, record, defaultValue });
  return <GeoJsonFieldBody value={value} {...body} />;
}
