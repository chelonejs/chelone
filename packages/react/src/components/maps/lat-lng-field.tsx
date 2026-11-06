import {
  type LooseRecord,
  type MapStyleInput,
  type SourceProp,
  toCoordinate,
} from "@chelone/core";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import { MapCanvas, MapMarker } from "./map-canvas";

export interface LatLngFieldProps<TRecord = LooseRecord> {
  /** The record property holding the latitude. */
  latSource: SourceProp<TRecord>;
  /** The record property holding the longitude. */
  lngSource: SourceProp<TRecord>;
  /** Defaults to the ambient record. */
  record?: TRecord;
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  className?: string;
}

/** MapLibre throws on a coordinate outside its range, so the field treats one as missing. */
function inRange(value: number | null, limit: number): number | null {
  return value !== null && Math.abs(value) <= limit ? value : null;
}

/**
 * Shows a point held in two record fields on a map. A missing, null,
 * non-numeric or out-of-range coordinate shows a text panel in its place; `0` is a position.
 *
 * @example
 * <LatLngField latSource="latitude" lngSource="longitude" />
 */
export function LatLngField<TRecord = LooseRecord>({
  latSource,
  lngSource,
  record,
  zoom,
  height,
  mapStyle,
  className,
}: LatLngFieldProps<TRecord>) {
  const translate = useTranslate();
  const lat = inRange(
    toCoordinate(useFieldValue({ source: latSource, record })),
    90,
  );
  const lng = inRange(
    toCoordinate(useFieldValue({ source: lngSource, record })),
    180,
  );

  if (lat === null || lng === null) {
    return (
      <div
        data-slot="lat-lng-field-empty"
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground",
          className,
        )}
        style={{ height: height ?? 300 }}
      >
        {translate("chelone.map.no_coordinates", {
          _: "No coordinates available",
        })}
      </div>
    );
  }

  return (
    <div data-slot="lat-lng-field" className={className}>
      <MapCanvas
        // The canvas reads its center once, so new coordinates rebuild it.
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={zoom}
        height={height}
        mapStyle={mapStyle}
        scrollZoom={false}
      >
        <MapMarker position={[lat, lng]} />
      </MapCanvas>
    </div>
  );
}
