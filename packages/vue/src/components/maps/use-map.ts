import {
  type GeocodingProvider,
  latLngToLngLat,
  type MapStyleInput,
  type OverpassProvider,
  type RoutingProvider,
} from "@chelone/core";
import { type Map as MapLibreMap, Marker } from "maplibre-gl";
import {
  defineComponent,
  type InjectionKey,
  inject,
  onBeforeUnmount,
  provide,
  type Ref,
  toValue,
  watch,
} from "vue";

/** The app-level map services. */
export interface MapsConfig {
  /** The basemap: a MapLibre style URL, or an object from `rasterTileStyle`. */
  mapStyle?: MapStyleInput;
  /** The geocoding service. The library names none: the app passes a provider. */
  geocoder?: GeocodingProvider;
  /** The Overpass service. The library names none: the app passes a provider. */
  overpass?: OverpassProvider;
  /** The routing service `LineStringInput` snaps drawn lines to roads with. The library names none. */
  router?: RoutingProvider;
}

const MapsConfigKey: InjectionKey<MapsConfig> = Symbol("chelone-maps-config");

export interface MapsProviderProps extends MapsConfig {}

/**
 * Sets the map services once, near the app root. The library ships none: a
 * component takes the matching prop instead when there is no provider.
 *
 * @example
 * <MapsProvider :map-style="rasterTileStyle({ tileUrl, attribution })">
 *   <Admin>...</Admin>
 * </MapsProvider>
 */
export const MapsProvider = defineComponent(
  (props: MapsProviderProps, { slots }) => {
    // Getters, so a changed prop reaches the maps that read it later.
    provide(MapsConfigKey, {
      get mapStyle() {
        return props.mapStyle;
      },
      get geocoder() {
        return props.geocoder;
      },
      get overpass() {
        return props.overpass;
      },
      get router() {
        return props.router;
      },
    });
    return () => slots.default?.();
  },
  {
    name: "MapsProvider",
    props: { mapStyle: null, geocoder: null, overpass: null, router: null },
  },
);

/** The services from the nearest `MapsProvider`; empty when there is none. */
export function useMapsConfig(): MapsConfig {
  return inject(MapsConfigKey, {});
}

/** Holds the map once it has loaded; `null` before. */
const MapKey: InjectionKey<Readonly<Ref<MapLibreMap | null>>> =
  Symbol("chelone-map");

/** Gives the subtree the map a `MapCanvas` is building. */
export function provideMap(map: Readonly<Ref<MapLibreMap | null>>): void {
  provide(MapKey, map);
}

/** The map of the nearest `MapCanvas`. Throws outside one. */
export function useMap(): MapLibreMap {
  const map = inject(MapKey, null)?.value;
  if (!map) throw new Error("useMap must be used inside a <MapCanvas>.");
  return map;
}

export interface MapMarkerOptions {
  /** `[lat, lng]`. */
  position: readonly [lat: number, lng: number];
  draggable?: boolean;
  /** Called with the dropped position. */
  onDragEnd?: (lat: number, lng: number) => void;
  /** Any CSS color. Defaults to red. */
  color?: string;
}

const PIN_NS = "http://www.w3.org/2000/svg";
const DEFAULT_PIN_COLOR = "#dc2626";

/** A pin whose tip is the bottom edge of the element. */
function createPin(color: string) {
  const svg = document.createElementNS(PIN_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 36");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "36");
  svg.setAttribute("aria-hidden", "true");
  const body = document.createElementNS(PIN_NS, "path");
  body.setAttribute(
    "d",
    "M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z",
  );
  body.setAttribute("fill", color);
  const dot = document.createElementNS(PIN_NS, "circle");
  dot.setAttribute("cx", "12");
  dot.setAttribute("cy", "12");
  dot.setAttribute("r", "4.5");
  dot.setAttribute("fill", "#fff");
  svg.append(body, dot);
  const element = document.createElement("div");
  element.append(svg);
  return { element, body };
}

/**
 * Puts a pin on the surrounding `MapCanvas` and removes it when the caller
 * unmounts. `options` may be a getter or a ref: a changed position, draggable
 * flag or color updates the same marker.
 */
export function useMapMarker(
  options:
    | MapMarkerOptions
    | Readonly<Ref<MapMarkerOptions>>
    | (() => MapMarkerOptions),
): Marker {
  const map = useMap();
  const now = toValue(options);
  const [lat, lng] = now.position;
  const pin = createPin(now.color ?? DEFAULT_PIN_COLOR);
  const marker = new Marker({
    element: pin.element,
    anchor: "bottom",
    draggable: now.draggable ?? false,
  })
    .setLngLat(latLngToLngLat([lat, lng]))
    .addTo(map);
  marker.on("dragend", () => {
    const dropped = marker.getLngLat();
    toValue(options).onDragEnd?.(dropped.lat, dropped.lng);
  });

  watch(
    () => {
      const { position, draggable, color } = toValue(options);
      return [position[0], position[1], draggable ?? false, color] as const;
    },
    ([latitude, longitude, draggable, color]) => {
      marker.setLngLat(latLngToLngLat([latitude, longitude]));
      marker.setDraggable(draggable);
      pin.body.setAttribute("fill", color ?? DEFAULT_PIN_COLOR);
    },
  );

  onBeforeUnmount(() => {
    marker.remove();
  });
  return marker;
}

/**
 * A pin on the surrounding `MapCanvas`.
 *
 * @example
 * <MapMarker :position="[48.85, 2.35]" draggable @drag-end="(lat, lng) => ..." />
 */
export const MapMarker = defineComponent(
  (
    props: {
      /** `[lat, lng]`. */
      position: readonly [lat: number, lng: number];
      draggable?: boolean;
      /** Any CSS color. Defaults to red. */
      color?: string;
    },
    { emit },
  ) => {
    useMapMarker(() => ({
      position: props.position,
      draggable: props.draggable,
      color: props.color,
      onDragEnd: (lat, lng) => emit("dragEnd", lat, lng),
    }));
    return () => null;
  },
  {
    name: "MapMarker",
    props: {
      position: null,
      draggable: { type: Boolean, default: false },
      color: { type: String, default: DEFAULT_PIN_COLOR },
    },
    emits: {
      dragEnd: (_lat: number, _lng: number) => true,
    },
  },
);

export type MapMarkerProps = InstanceType<typeof MapMarker>["$props"];
