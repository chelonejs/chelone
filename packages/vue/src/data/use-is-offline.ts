/**
 * `useIsOffline` — the Vue twin of `@chelone/react`'s `useIsOffline`
 * (`compat-hooks.ts`). Bridges core's `createOfflineStore` through
 * `useMicroStoreSelector`, so the `online`/`offline` listeners attach on setup
 * and detach on scope disposal.
 */

import { createOfflineStore } from "@chelone/core";
import type { Ref } from "vue";
import { useMicroStoreSelector } from "../store/use-micro-store";

/**
 * `true` while the browser reports itself offline. Reads `navigator.onLine`,
 * so a page opened offline is offline from the first render.
 */
export function useIsOffline(): Readonly<Ref<boolean>> {
  return useMicroStoreSelector(
    createOfflineStore(),
    (snapshot) => snapshot.isOffline,
  );
}
