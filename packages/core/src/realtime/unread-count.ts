import type { CheloneStore } from "../store/store";
import { resourceTopic } from "./topics";
import type {
  RealtimeDataProvider,
  RealtimeEventType,
  Unsubscribe,
} from "./types";

export interface SubscribeUnreadCountOptions {
  dataProvider: RealtimeDataProvider;
  store: CheloneStore;
  resource: string;
  /** Event types that count as unread. Defaults to `["created"]`. */
  events?: RealtimeEventType[];
}

const DEFAULT_EVENTS: RealtimeEventType[] = ["created"];

/**
 * The store key of a resource's unread count for an event list. The default
 * `["created"]` keeps `realtime.unread.<resource>`; any other list adds its
 * sorted, de-duplicated types as a suffix, so the order of `events` never
 * splits a count and links watching different events never share one.
 */
export function unreadKey(
  resource: string,
  events: RealtimeEventType[] = DEFAULT_EVENTS,
): string {
  const types = [...new Set(events)].sort();
  const base = `realtime.unread.${resource}`;
  return types.length === 1 && types[0] === "created"
    ? base
    : `${base}.${types.join("+")}`;
}

/** Adds one to the count under `unreadKey(resource, events)` for each listed event. Returns the teardown. */
export function subscribeUnreadCount({
  dataProvider,
  store,
  resource,
  events = DEFAULT_EVENTS,
}: SubscribeUnreadCountOptions): Unsubscribe {
  const key = unreadKey(resource, events);
  return dataProvider.subscribe(resourceTopic(resource), (event) => {
    if (!events.includes(event.type)) return;
    store.setItem(key, (store.getItem<number>(key) ?? 0) + 1);
  });
}

/** Resets the count of one event list; pass the same `events` the link subscribed with. */
export function clearUnread(
  store: CheloneStore,
  resource: string,
  events?: RealtimeEventType[],
): void {
  store.setItem(unreadKey(resource, events), 0);
}
