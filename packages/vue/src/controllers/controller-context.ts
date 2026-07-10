/**
 * `toControllerContext` — projects the ambient Chelone context (what `<Admin>`
 * provides) into the structural context the vanilla core controllers consume.
 * The Vue twin of the same helper in `@chelone/react`'s `controller-hooks.ts`.
 *
 * Both controller families (list + record) need the same services, so ONE
 * structural context (`ListControllerContext & RecordControllerContext`) covers
 * every `createXController` call. The only reshape is i18n → a plain
 * `translate(key)` closure (the controllers want a function, not the whole
 * instance), exactly as the React twin does it.
 */

import type {
  ListControllerContext,
  RecordControllerContext,
  ResourceMap,
} from "@chelone/core";
import type { CheloneContextValue } from "../context";

/** One structural context serving both the list and the record controllers. */
export function toControllerContext<TResources extends ResourceMap>(
  ctx: CheloneContextValue<TResources>,
): ListControllerContext<TResources> & RecordControllerContext<TResources> {
  const { dataProvider, queryClient, store, notifications, i18n } = ctx;
  return {
    dataProvider,
    queryClient,
    store,
    notifications,
    translate: i18n ? (key: string) => i18n.translate(key) : undefined,
  };
}
