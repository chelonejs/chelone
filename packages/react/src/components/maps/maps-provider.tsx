import type { MapStyleInput } from "@chelone/core";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/** The app-level map services. Later slices add the geocoder, Overpass and router. */
export interface MapsConfig {
  /** The basemap: a MapLibre style URL, or an object from `rasterTileStyle`. */
  mapStyle?: MapStyleInput;
}

export interface MapsProviderProps extends MapsConfig {
  children: ReactNode;
}

const MapsConfigContext = createContext<MapsConfig>({});

/**
 * Sets the map services once, near the app root. The library ships none: a
 * component takes the matching prop instead when there is no provider.
 *
 * @example
 * <MapsProvider mapStyle={rasterTileStyle({ tileUrl, attribution })}>
 *   <Admin>...</Admin>
 * </MapsProvider>
 */
export function MapsProvider({ children, mapStyle }: MapsProviderProps) {
  const config = useMemo(() => ({ mapStyle }), [mapStyle]);
  return (
    <MapsConfigContext.Provider value={config}>
      {children}
    </MapsConfigContext.Provider>
  );
}

/** The services from the nearest `MapsProvider`; empty when there is none. */
export function useMapsConfig(): MapsConfig {
  return useContext(MapsConfigContext);
}
