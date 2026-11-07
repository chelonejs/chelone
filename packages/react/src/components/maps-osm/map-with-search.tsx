import {
  DEFAULT_MAP_ZOOM,
  type GeocodingProvider,
  type LooseRecord,
  reverseGeocodeQueryOptions,
  type SourceProp,
} from "@chelone/core";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useCheloneFormContext, useWrappedSource } from "../../form-context";
import { LatLngInput } from "../maps/lat-lng-input";
import { useMapsConfig } from "../maps/maps-provider";
import { GeocodingInput } from "./geocoding-input";

export interface MapWithSearchProps<TRecord = LooseRecord> {
  /** The form field holding the latitude. */
  latSource: SourceProp<TRecord>;
  /** The form field holding the longitude. */
  lngSource: SourceProp<TRecord>;
  /** The form field holding the address text. */
  addressSource: SourceProp<TRecord>;
  /** In pixels, or any CSS length. Defaults to 400. */
  height?: number | string;
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  className?: string;
}

/**
 * An address search over a map. Picking a result fills the address and the
 * coordinates, and the marker moves there. Clicking the map or dragging the
 * pin writes the address of that spot, unless the service finds none. The
 * address is looked up only after such a gesture, never on mount and never
 * after a pick, so a picked address is not overwritten.
 *
 * Needs the optional `maplibre-gl` peer.
 *
 * @example
 * <MapWithSearch
 *   latSource="latitude"
 *   lngSource="longitude"
 *   addressSource="address"
 *   provider={createNominatimProvider({ endpoint })}
 * />
 */
export function MapWithSearch<TRecord = LooseRecord>({
  latSource,
  lngSource,
  addressSource,
  height = 400,
  zoom = DEFAULT_MAP_ZOOM,
  provider,
  className,
}: MapWithSearchProps<TRecord>) {
  const queryClient = useQueryClient();
  const { geocoder } = useMapsConfig();
  const active = provider ?? geocoder;
  const { ambient } = useCheloneFormContext().form;
  const wrappedAddress = useWrappedSource(addressSource);
  const wrappedLat = useWrappedSource(latSource);
  const wrappedLng = useWrappedSource(lngSource);
  const gestures = useRef(0);

  const reverse = (lat: number, lng: number) => {
    if (!active) return;
    const gesture = ++gestures.current;
    queryClient
      .fetchQuery(reverseGeocodeQueryOptions(active, { lat, lng }))
      .then((result) => {
        if (!result || gesture !== gestures.current) return;
        // A search pick since the gesture moved the coordinates on.
        if (
          ambient.getFieldValue(wrappedLat) !== lat ||
          ambient.getFieldValue(wrappedLng) !== lng
        ) {
          return;
        }
        ambient.setFieldValue(wrappedAddress, result.displayName);
      })
      .catch(() => {});
  };

  return (
    <div
      data-slot="map-with-search"
      className={cn("flex flex-col gap-3", className)}
    >
      <GeocodingInput<TRecord>
        source={addressSource}
        latSource={latSource}
        lngSource={lngSource}
        provider={provider}
      />
      <LatLngInput<TRecord>
        latSource={latSource}
        lngSource={lngSource}
        label={false}
        height={height}
        zoom={zoom}
        onPositionChange={reverse}
      />
    </div>
  );
}
