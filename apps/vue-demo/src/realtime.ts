/**
 * The demo's realtime wiring: one in-memory transport, one lock provider that
 * announces on it, and the data provider every `<Admin>` view talks to. The
 * transport needs no server, so a second "user" is a button
 * (`realtime-sim.vue`), not a second browser.
 */

import {
  addEventsForMutations,
  createDataProviderLog,
  fakeDataProvider,
  inMemoryLockProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { seedData, withTextSearch } from "@chelone/demo-data";

export const transport = memoryTransport();
export const locks = inMemoryLockProvider({ publisher: transport });

// What `<DataProviderDevtools>` lists. It wraps the in-memory provider alone:
// the realtime layer on top adds `subscribe`, which returns a function where
// the log's wrapper would return a promise.
export const dataProviderLog = createDataProviderLog();

// Seeded once: the in-memory provider mutates its data in place. It matches
// filters by equality, so `withTextSearch` adds the product list's `q` search. Writes made
// through `dataProvider` publish on the transport, so open lists refetch.
export const dataProvider = addEventsForMutations(
  realtimeDataProvider(
    dataProviderLog.wrap(
      withTextSearch(fakeDataProvider(seedData()), {
        products: ["name", "sku", "keywords"],
      }),
    ),
    transport,
    { locks },
  ),
  transport,
);
