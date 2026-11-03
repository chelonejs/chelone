/**
 * The only file that names a public map service. Each service below is the
 * community instance, run on donated hardware under a usage policy: they suit
 * demos and light use only. A production app builds its own providers against
 * services it hosts or pays for (see the maps guide).
 */

import {
  createNominatimProvider,
  createOsrmProvider,
  createOverpassProvider,
  rasterTileStyle,
} from "@chelone/core";
import type { MapsConfig } from "@chelone/vue/maps";

export const mapsConfig = {
  // OSM tile usage policy (https://operations.osmfoundation.org/policies/tiles/); demos and light use only.
  mapStyle: rasterTileStyle({
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }),
  // Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/); demos and light use only.
  geocoder: createNominatimProvider({
    endpoint: "https://nominatim.openstreetmap.org",
  }),
  // Overpass API usage policy (https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances); demos and light use only.
  overpass: createOverpassProvider({
    endpoint: "https://overpass-api.de/api/interpreter",
  }),
  // OSRM demo server policy (https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server); demos and light use only.
  router: createOsrmProvider({ endpoint: "https://router.project-osrm.org" }),
} satisfies MapsConfig;
