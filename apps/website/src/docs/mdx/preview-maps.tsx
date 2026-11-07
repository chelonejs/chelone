/**
 * The map services a maps demo reads, as the maps guide sets them in an app.
 * It is its own file so the docs pages that show no map never load MapLibre:
 * a demo imports it, the preview provider does not.
 */
import { createNominatimProvider, rasterTileStyle } from "@chelone/core";
import { MapsProvider } from "@chelone/react/maps";
import type { ReactNode } from "react";

// The community OpenStreetMap services, which suit demos and light use only.
const config = {
  mapStyle: rasterTileStyle({
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }),
  geocoder: createNominatimProvider({
    endpoint: "https://nominatim.openstreetmap.org",
  }),
};

export function PreviewMaps({ children }: { children: ReactNode }) {
  return <MapsProvider {...config}>{children}</MapsProvider>;
}
