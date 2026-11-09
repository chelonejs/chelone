/**
 * The data provider server functions read. Unlike the one `getRouter()` builds
 * per request, this one lives as long as the server process, so a write made
 * through a server function shows in the next server render.
 */

import { fakeDataProvider } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import type { StartDemoResources } from "./resources";

export const serverDataProvider = fakeDataProvider<StartDemoResources>(
  seedData(),
);
