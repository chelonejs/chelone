import {
  asFeatureCollection,
  DEFAULT_FIT_PADDING,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAX_FIT_ZOOM,
  geoBounds,
  isGeoJsonValue,
  isLngLatBox,
  type JsonObject,
  type MapStyleInput,
  placedFeatures,
  type ShapeStyle,
  type SourceProp,
  shapeLayerSpecs,
} from "@chelone/core";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import { MapCanvas, useMap } from "./map-canvas";

type GeoJsonCollection = FeatureCollection<Geometry | null, JsonObject | null>;

/** What a map input stores: a geometry, a Feature or a FeatureCollection. */
type GeoJsonInput =
  | Geometry
  | Feature<Geometry | null, JsonObject | null>
  | GeoJsonCollection;

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

/** What `GeoJsonFieldBody` takes besides the value: the view and the empty text. */
export interface GeoJsonFieldBodyProps extends GeoJsonViewProps {
  /** Replaces the translation of `chelone.map.no_geometry`. */
  emptyText?: string;
}

// type-escape: context: without a `record` the paths are loose, as `SourceProp<unknown>` is
export interface GeoJsonFieldProps<RecordType = unknown>
  extends GeoJsonFieldBodyProps {
  /** The record property holding the GeoJSON value. */
  source: SourceProp<RecordType>;
  /** Defaults to the ambient record. */
  record?: RecordType;
  /** Used when the property is `undefined`. */
  defaultValue?: unknown;
}

/**
 * Keeps one GeoJSON source and its fill, line and point layers on `map`.
 * `data` goes to `setData`; a changed `style` replaces the layers; unmounting
 * removes both.
 */
export function useGeoJsonSource(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJsonCollection,
  style: ShapeStyle,
): void {
  const specs = shapeLayerSpecs(sourceId, style);
  const specsKey = JSON.stringify(specs);
  const latest = useRef({ data, specs, specsKey });
  latest.current = { data, specs, specsKey };
  const applied = useRef({ data, specsKey });

  useEffect(() => {
    const now = latest.current;
    map.addSource(sourceId, {
      type: "geojson",
      data: placedFeatures(now.data),
    });
    for (const spec of now.specs) map.addLayer(spec);
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
    map.getSource<GeoJSONSource>(sourceId)?.setData(placedFeatures(data));
  }, [map, sourceId, data]);

  useEffect(() => {
    if (applied.current.specsKey === specsKey) return;
    applied.current.specsKey = specsKey;
    for (const spec of latest.current.specs) {
      if (map.getLayer(spec.id)) map.removeLayer(spec.id);
      map.addLayer(spec);
    }
  }, [map, specsKey]);
}

/** Props for {@link GeoJsonLayers}: the framing options, and the data to draw. */
export interface GeoJsonLayersProps
  extends Pick<
    GeoJsonViewProps,
    "shapeStyle" | "fitBounds" | "fitPadding" | "maxFitZoom"
  > {
  /** A Geometry, Feature or FeatureCollection. */
  data: GeoJsonInput;
}

/**
 * Draws a Geometry, Feature or FeatureCollection on the surrounding
 * `MapCanvas` and frames the map around it. Throws outside a `MapCanvas`: use
 * `GeoJsonView` for a map of its own.
 *
 * @example
 * <MapCanvas>
 *   <GeoJsonLayers data={{ type: "Point", coordinates: [2.35, 48.85] }} />
 * </MapCanvas>
 */
export function GeoJsonLayers({
  data: value,
  shapeStyle,
  fitBounds = true,
  fitPadding = DEFAULT_FIT_PADDING,
  maxFitZoom = DEFAULT_MAX_FIT_ZOOM,
}: GeoJsonLayersProps) {
  const map = useMap();
  const sourceId = `geo-json-${useId()}`;
  const data = useMemo(() => asFeatureCollection(value), [value]);
  useGeoJsonSource(map, sourceId, data, shapeStyle ?? {});

  const box = useMemo(() => geoBounds(value), [value]);
  // The box as text, so a new object with the same corners does not refit.
  const boxKey = box ? box.join(",") : "";
  const latest = useRef({ box, fitPadding, maxFitZoom });
  latest.current = { box, fitPadding, maxFitZoom };

  // biome-ignore lint/correctness/useExhaustiveDependencies: boxKey stands for the box
  useEffect(() => {
    const now = latest.current;
    if (!fitBounds || !isLngLatBox(now.box)) return;
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
 * `GeoJsonField` and the drawing inputs' read-only state use it. To draw on a
 * `MapCanvas` you already have, use `GeoJsonLayers`.
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
}: GeoJsonViewProps & { data: GeoJsonInput }) {
  return (
    <MapCanvas
      height={height}
      mapStyle={mapStyle}
      scrollZoom={scrollZoom}
      className={className}
    >
      <GeoJsonLayers data={data} {...layers} />
    </MapCanvas>
  );
}

/** Shows `value` on a map, or the empty panel when it is not GeoJSON. */
export function GeoJsonFieldBody({
  value,
  emptyText,
  className,
  height,
  ...view
}: GeoJsonFieldBodyProps & { value: unknown }) {
  const translate = useTranslate();
  if (!isGeoJsonValue(value) || !isLngLatBox(geoBounds(value))) {
    return (
      <div
        data-slot="geo-json-field-empty"
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground",
          className,
        )}
        style={{ height: height ?? DEFAULT_MAP_HEIGHT }}
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
export function GeoJsonField<RecordType>({
  source,
  record,
  defaultValue,
  ...body
}: GeoJsonFieldProps<RecordType>) {
  const read: unknown = useFieldValue<RecordType>({ source, record });
  const value = read === undefined ? defaultValue : read;
  return <GeoJsonFieldBody value={value} {...body} />;
}
