/**
 * The `HasDashboard` seam — the Vue twin of `@chelone/react`'s
 * `admin/has-dashboard.ts` (`HasDashboardContext` + `useHasDashboard`). `<Admin>`
 * provides whether a `#dashboard` slot was given so any descendant (the sidebar
 * `<Menu>`) can render a "Dashboard" entry ONLY when a dashboard exists.
 *
 * Vue idiom: React's `createContext`/`useContext` become a typed provide/inject
 * pair. The inject default is `false`, so a `<Menu>` mounted without an `<Admin>`
 * (or without a dashboard) simply omits the dashboard item — never throwing.
 */

import { type InjectionKey, inject, provide } from "vue";

/** The provide/inject key carrying whether the app registered a dashboard. */
export const HasDashboardKey: InjectionKey<boolean> = Symbol(
  "chelone-has-dashboard",
);

/** Provide the dashboard flag for the subtree. `<Admin>` calls this in `setup`. */
export function provideHasDashboard(value: boolean): void {
  provide(HasDashboardKey, value);
}

/** Read whether the app has a dashboard (drives the conditional menu entry). */
export function useHasDashboard(): boolean {
  return inject(HasDashboardKey, false);
}
