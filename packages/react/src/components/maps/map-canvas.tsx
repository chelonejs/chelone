import { latLngToLngLat, type MapStyleInput } from "@chelone/core";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { useMapsConfig } from "./maps-provider";

const MapContext = createContext<MapLibreMap | null>(null);

/** The map of the nearest `MapCanvas`. Throws outside one. */
export function useMap(): MapLibreMap {
  const map = useContext(MapContext);
  if (!map) throw new Error("useMap must be used inside a <MapCanvas>.");
  return map;
}

export interface MapCanvasProps {
  /** `[lat, lng]`. Read once at mount. Defaults to `[0, 0]`. */
  center?: readonly [lat: number, lng: number];
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /**
   * A MapLibre style URL, or a style object such as `rasterTileStyle(...)`.
   * Read once at mount. Defaults to the one from `MapsProvider`.
   */
  mapStyle?: MapStyleInput;
  /** Zoom with the mouse wheel. Defaults to true. */
  scrollZoom?: boolean;
  className?: string;
  /** Rendered once the map has loaded. */
  children?: ReactNode;
}

/**
 * One MapLibre map. Center, zoom and style are read at mount: change `key` to
 * rebuild. Browsers cap live WebGL contexts near 16 per page, and each canvas
 * holds one, so keep long lists of maps short.
 *
 * Needs the optional `maplibre-gl` peer.
 *
 * @example
 * <MapCanvas mapStyle={style} center={[48.85, 2.35]}>
 *   <MapMarker position={[48.85, 2.35]} />
 * </MapCanvas>
 */
export function MapCanvas({
  center = [0, 0],
  zoom = 13,
  height = 300,
  mapStyle,
  scrollZoom = true,
  className,
  children,
}: MapCanvasProps) {
  const configured = useMapsConfig().mapStyle;
  const style = mapStyle ?? configured;
  if (style === undefined) {
    throw new Error(
      "MapCanvas needs a basemap: pass the mapStyle prop, or wrap the app in <MapsProvider mapStyle={...}>. Build one with rasterTileStyle({ tileUrl, attribution }) or pass a MapLibre style URL.",
    );
  }

  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // Read once, when the effect builds the map.
  const initial = useRef({ style, center, zoom, scrollZoom });
  initial.current = { style, center, zoom, scrollZoom };

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const { style, center, zoom, scrollZoom } = initial.current;
    const created = new MapLibreMap({
      container: element,
      style,
      center: latLngToLngLat(center),
      zoom,
      scrollZoom,
    });
    let active = true;
    created.on("load", () => {
      if (active) setMap(created);
    });
    return () => {
      active = false;
      setMap(null);
      created.remove();
    };
  }, []);

  return (
    <div
      ref={container}
      data-slot="map-canvas"
      className={cn("relative w-full overflow-hidden rounded-md", className)}
      style={{ height }}
    >
      {map ? (
        <MapContext.Provider value={map}>{children}</MapContext.Provider>
      ) : null}
    </div>
  );
}

export interface MapMarkerProps {
  /** `[lat, lng]`. */
  position: readonly [lat: number, lng: number];
  draggable?: boolean;
  /** Called with the dropped position. The latest function is always used. */
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

/** A pin on the surrounding `MapCanvas`. */
export function MapMarker({
  position,
  draggable = false,
  onDragEnd,
  color = DEFAULT_PIN_COLOR,
}: MapMarkerProps) {
  const map = useMap();
  const [lat, lng] = position;
  const marker = useRef<Marker | null>(null);
  const body = useRef<SVGPathElement | null>(null);
  const latest = useRef({ lat, lng, draggable, color, onDragEnd });
  latest.current = { lat, lng, draggable, color, onDragEnd };

  useEffect(() => {
    const now = latest.current;
    const pin = createPin(now.color);
    const created = new Marker({
      element: pin.element,
      anchor: "bottom",
      draggable: now.draggable,
    })
      .setLngLat([now.lng, now.lat])
      .addTo(map);
    created.on("dragend", () => {
      const dropped = created.getLngLat();
      latest.current.onDragEnd?.(dropped.lat, dropped.lng);
    });
    marker.current = created;
    body.current = pin.body;
    return () => {
      created.remove();
      marker.current = null;
      body.current = null;
    };
  }, [map]);

  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  useEffect(() => {
    marker.current?.setDraggable(draggable);
  }, [draggable]);

  useEffect(() => {
    body.current?.setAttribute("fill", color);
  }, [color]);

  return null;
}
