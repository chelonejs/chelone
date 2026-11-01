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

export const unreadKey = (resource: string): string =>
  `realtime.unread.${resource}`;

/** Adds one to the resource's unread count for each listed event. Returns the teardown. */
export function subscribeUnreadCount({
  dataProvider,
  store,
  resource,
  events = ["created"],
}: SubscribeUnreadCountOptions): Unsubscribe {
  const key = unreadKey(resource);
  return dataProvider.subscribe(resourceTopic(resource), (event) => {
    if (!events.includes(event.type)) return;
    store.setItem(key, (store.getItem<number>(key) ?? 0) + 1);
  });
}

export function clearUnread(store: CheloneStore, resource: string): void {
  store.setItem(unreadKey(resource), 0);
}
