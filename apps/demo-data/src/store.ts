import {
  type CheloneStore,
  createStore,
  localStorageAdapter,
  onboardingTourKey,
} from "@chelone/core";
import { TOUR_ID } from "./tour";

/**
 * The demos' store: it keeps choices in `localStorage`, so the tour that opens
 * on a first visit stays closed afterwards. A browser under automation, such
 * as the one that photographs each page, never gets the tour at load: its
 * scrim would cover every page and block every click. The user menu opens it.
 */
export function makeDemoStore(): CheloneStore {
  const store = createStore(localStorageAdapter());
  if (navigator.webdriver) store.setItem(onboardingTourKey(TOUR_ID), true);
  return store;
}
