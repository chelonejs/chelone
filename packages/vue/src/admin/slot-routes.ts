import { joinBasename } from "@chelone/core";
import { type Component, defineComponent, markRaw, type Slots } from "vue";
import { type Router, useRoute } from "vue-router";
import { type CustomRoute, toRouteRecord } from "./custom-routes";

/** The route meta key marking the `#catchAll` route, which matches any path. */
export const CATCH_ALL_META = "chelone:catchAll";

type PageSlotName =
  | "authCallback"
  | "authenticationError"
  | "accessDenied"
  | "catchAll";

const PAGE_SLOTS: Array<{
  name: PageSlotName;
  path: string;
  noLayout?: boolean;
}> = [
  { name: "authCallback", path: "/auth-callback", noLayout: true },
  { name: "authenticationError", path: "/authentication-error" },
  { name: "accessDenied", path: "/access-denied" },
  { name: "catchAll", path: "/:pathMatch(.*)*" },
];

/** A route component that renders the slot as it is now, not as it was at setup. */
function slotPage(slots: Slots, name: PageSlotName): Component {
  return markRaw(defineComponent({ setup: () => () => slots[name]?.() }));
}

/**
 * The catch-all also matches the basename root, which the dashboard or the
 * first-resource redirect owns, so it renders nothing there.
 */
function catchAllPage(slots: Slots, basename: string): Component {
  const indexPath = joinBasename("/", basename).toLowerCase();
  return markRaw(
    defineComponent({
      setup() {
        const route = useRoute();
        return () => {
          const path = route.path.toLowerCase();
          return path === indexPath || path === `${indexPath}/`
            ? null
            : slots.catchAll?.();
        };
      },
    }),
  );
}

/**
 * Routes for the page slots that are given, under `basename`. `sync` adds the
 * route of a slot that has appeared and removes that of one that has gone, so
 * call it on each update: `useSlots()` is not reactive.
 */
export function createSlotRoutes(
  router: Router,
  slots: Slots,
  basename: string,
) {
  const removers = new Map<PageSlotName, () => void>();

  /** Returns whether a route was added. */
  function sync(): boolean {
    let added = false;
    for (const { name, path, noLayout } of PAGE_SLOTS) {
      const given = slots[name] != null;
      if (!given) {
        removers.get(name)?.();
        removers.delete(name);
      } else if (!removers.has(name)) {
        const route: CustomRoute = {
          path,
          noLayout,
          component:
            name === "catchAll"
              ? catchAllPage(slots, basename)
              : slotPage(slots, name),
        };
        const record = toRouteRecord(route, basename);
        removers.set(
          name,
          router.addRoute(
            name === "catchAll"
              ? { ...record, meta: { ...record.meta, [CATCH_ALL_META]: true } }
              : record,
          ),
        );
        added = true;
      }
    }
    return added;
  }

  function dispose() {
    for (const remove of removers.values()) remove();
    removers.clear();
  }

  return { sync, dispose };
}
