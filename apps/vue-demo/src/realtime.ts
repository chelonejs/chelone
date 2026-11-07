/**
 * The demo's realtime wiring: one in-memory transport, one lock provider that
 * announces on it, and the data provider every `<Admin>` view talks to. The
 * transport needs no server, so a second "user" is a button
 * (`realtime-sim.vue`), not a second browser.
 */

import {
  addEventsForMutations,
  fakeDataProvider,
  inMemoryLockProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { seedData } from "@chelone/demo-data";

export const transport = memoryTransport();
export const locks = inMemoryLockProvider({ publisher: transport });

// Seeded once: the in-memory provider mutates its data in place. Writes made
// through `dataProvider` publish on the transport, so open lists refetch.
export const dataProvider = addEventsForMutations(
  realtimeDataProvider(fakeDataProvider(seedData()), transport, { locks }),
  transport,
);
