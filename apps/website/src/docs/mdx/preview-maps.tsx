/**
 * The map services a maps demo reads, as the maps guide sets them in an app.
 * It is its own file so the docs pages that show no map never load MapLibre:
 * a demo imports it, the preview provider does not.
 */
import {
  createNominatimProvider,
  createOverpassProvider,
  rasterTileStyle,
} from "@chelone/core";
import { Create } from "@chelone/react";
import { MapsProvider } from "@chelone/react/maps";
import type { ReactNode } from "react";
import { previewPlace } from "./preview-fixtures";

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
  overpass: createOverpassProvider({
    endpoint: "https://overpass-api.de/api/interpreter",
  }),
};

export function PreviewMaps({ children }: { children: ReactNode }) {
  return <MapsProvider {...config}>{children}</MapsProvider>;
}

/**
 * A form seeded with `previewPlace`, for the map inputs: each edits one of its
 * fields and shows no page title or save button.
 */
export function PreviewPlaceForm({ children }: { children: ReactNode }) {
  return (
    <PreviewMaps>
      <div className="flex w-full max-w-xl flex-col gap-4">
        <Create record={previewPlace} title={false}>
          {children}
        </Create>
      </div>
    </PreviewMaps>
  );
}
