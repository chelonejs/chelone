import { joinBasename } from "@chelone/core";
import { type Component, defineComponent, markRaw, type Slot } from "vue";
import { type RouteRecordRaw, useRoute } from "vue-router";
import { type CustomRoute, toRouteRecord } from "./custom-routes";

/** The page slots `<Admin>` mounts as routes, each only when given. */
export interface PageSlots {
  authCallback?: Slot;
  authenticationError?: Slot;
  accessDenied?: Slot;
  catchAll?: Slot;
}

/** A route component that renders `slot`, captured at setup. */
function slotPage(slot: Slot): Component {
  return markRaw(defineComponent({ setup: () => () => slot() }));
}

/**
 * The catch-all also matches the basename root, which the dashboard or the
 * first-resource redirect owns, so it renders nothing there.
 */
function catchAllPage(slot: Slot, basename: string): Component {
  const indexPath = joinBasename("/", basename).toLowerCase();
  return markRaw(
    defineComponent({
      setup() {
        const route = useRoute();
        return () => {
          const path = route.path.toLowerCase();
          return path === indexPath || path === `${indexPath}/` ? null : slot();
        };
      },
    }),
  );
}

/** The route records for the page slots that were given, under `basename`. */
export function slotRouteRecords(
  slots: PageSlots,
  basename: string,
): RouteRecordRaw[] {
  const routes: CustomRoute[] = [];
  if (slots.authCallback) {
    routes.push({
      path: "/auth-callback",
      component: slotPage(slots.authCallback),
      noLayout: true,
    });
  }
  if (slots.authenticationError) {
    routes.push({
      path: "/authentication-error",
      component: slotPage(slots.authenticationError),
    });
  }
  if (slots.accessDenied) {
    routes.push({
      path: "/access-denied",
      component: slotPage(slots.accessDenied),
    });
  }
  if (slots.catchAll) {
    routes.push({
      path: "/:pathMatch(.*)*",
      component: catchAllPage(slots.catchAll, basename),
    });
  }
  return routes.map((route) => toRouteRecord(route, basename));
}
