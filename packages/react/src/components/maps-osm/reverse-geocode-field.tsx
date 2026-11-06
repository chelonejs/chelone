import {
  type GeocodingProvider,
  type LooseRecord,
  type SourceProp,
  toCoordinate,
} from "@chelone/core";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import { useReverseGeocode } from "./use-reverse-geocode";

export interface ReverseGeocodeFieldProps<TRecord = LooseRecord> {
  /** The record property holding the latitude. */
  latSource: SourceProp<TRecord>;
  /** The record property holding the longitude. */
  lngSource: SourceProp<TRecord>;
  /** Defaults to the ambient record. */
  record?: TRecord;
  /** `full` is the whole name, `street` its first part and `city` its first two. Defaults to `full`. */
  format?: "full" | "street" | "city";
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  className?: string;
}

function shorten(name: string, format: "full" | "street" | "city"): string {
  if (format === "full") return name;
  const parts = name.split(",").map((part) => part.trim());
  return parts.slice(0, format === "street" ? 1 : 2).join(", ");
}

/**
 * Names the position held in two record fields, such as the address of a
 * saved point. Renders nothing without both coordinates, a skeleton while the
 * lookup runs, and the rounded coordinates when the provider knows no place.
 *
 * Needs a geocoding provider, from the `provider` prop or `MapsProvider`'s
 * `geocoder`; with neither it throws.
 *
 * @example
 * <ReverseGeocodeField latSource="latitude" lngSource="longitude" format="city" />
 */
export function ReverseGeocodeField<TRecord = LooseRecord>({
  latSource,
  lngSource,
  record,
  format = "full",
  provider,
  className,
}: ReverseGeocodeFieldProps<TRecord>) {
  const lat = toCoordinate(useFieldValue({ source: latSource, record }));
  const lng = toCoordinate(useFieldValue({ source: lngSource, record }));
  const found = useReverseGeocode(
    { lat: lat ?? Number.NaN, lng: lng ?? Number.NaN },
    { provider },
  );
  if (lat === null || lng === null) return null;

  return (
    <span
      data-slot="reverse-geocode-field"
      className={cn("text-sm", className)}
    >
      {found.isPending ? (
        <Skeleton className="inline-block h-4 w-40 align-middle" />
      ) : found.data ? (
        shorten(found.data.displayName, format)
      ) : (
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      )}
    </span>
  );
}
