import {
  type CheloneStore,
  clearUnread,
  type RealtimeDataProvider,
  type RealtimeEventType,
  subscribeUnreadCount,
  unreadKey,
} from "@chelone/core";
import { type ReactNode, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useCheloneContext, useCheloneStore } from "../../../context";
import { useMatch } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useStoreItem } from "../../../store-hooks";

export interface MenuLiveItemLinkProps {
  /** Target path. The count clears while the current route is `to` or below it. */
  to: string;
  /** Resource whose events are counted. */
  resource: string;
  /** Link text. */
  label: ReactNode;
  /** Icon rendered before `label`. */
  icon?: ReactNode;
  /** Event types that count as new. Defaults to `["created"]`. */
  events?: RealtimeEventType[];
  /** Formats the badge text. Defaults to the count, `99+` above 99. */
  badgeLabel?: (count: number) => ReactNode;
}

export interface MenuLiveProps {
  items: MenuLiveItemLinkProps[];
}

const MAX_COUNT = 99;

interface SharedSubscription {
  /** Each mounted link's event types; the subscription counts their union. */
  holders: Map<symbol, string>;
  counted: string;
  stop?: () => void;
}

const subscriptions = new WeakMap<
  CheloneStore,
  WeakMap<object, Map<string, SharedSubscription>>
>();

/**
 * Two links for one resource share a store key, so they must share one
 * subscription: one each would add 1 per event apiece.
 */
function acquire(
  dataProvider: RealtimeDataProvider,
  store: CheloneStore,
  resource: string,
  holder: symbol,
  events: string,
): () => void {
  let byProvider = subscriptions.get(store);
  if (!byProvider) {
    byProvider = new WeakMap();
    subscriptions.set(store, byProvider);
  }
  let byResource = byProvider.get(dataProvider);
  if (!byResource) {
    byResource = new Map();
    byProvider.set(dataProvider, byResource);
  }

  const sync = (shared: SharedSubscription) => {
    const union = [...new Set([...shared.holders.values()].flatMap(split))];
    const counted = union.join(",");
    if (shared.stop && counted === shared.counted) return;
    if (shared.stop) shared.stop();
    shared.counted = counted;
    shared.stop = subscribeUnreadCount({
      dataProvider,
      store,
      resource,
      events: union.length ? (union as RealtimeEventType[]) : undefined,
    });
  };

  let shared = byResource.get(resource);
  if (!shared) {
    shared = { holders: new Map(), counted: "" };
    byResource.set(resource, shared);
  }
  shared.holders.set(holder, events);
  sync(shared);

  const entry = shared;
  return () => {
    entry.holders.delete(holder);
    if (entry.holders.size === 0) {
      entry.stop?.();
      byResource.delete(resource);
    } else {
      sync(entry);
    }
  };
}

const split = (events: string) => (events ? events.split(",") : []);

/**
 * A menu link with a badge counting the resource's new records since the user
 * last opened it. The count is kept in the store, so it survives a reload when
 * the store has an adapter. Needs a realtime data provider.
 *
 * @example
 * import { MenuLiveItemLink } from "@chelone/react";
 *
 * <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
 */
function MenuLiveItemLink({
  to,
  resource,
  label,
  icon,
  events,
  badgeLabel,
}: MenuLiveItemLinkProps) {
  const { dataProvider } = useCheloneContext();
  const store = useCheloneStore();
  const { Link } = useRouterAdapter();
  const [count = 0] = useStoreItem<number>(unreadKey(resource));
  const active = useMatch({ path: to, end: false }) !== null;
  // Joined so an inline `events` array does not resubscribe each render.
  const eventsKey = (events ?? ["created"]).join(",");

  useEffect(
    () =>
      acquire(
        dataProvider as RealtimeDataProvider,
        store,
        resource,
        Symbol(),
        eventsKey,
      ),
    [dataProvider, store, resource, eventsKey],
  );

  useEffect(() => {
    if (active && count > 0) clearUnread(store, resource);
  }, [active, count, store, resource]);

  return (
    <Link to={to} className="flex items-center gap-2">
      {icon}
      {label}
      {count > 0 && (
        <Badge data-testid="menu-live-badge" className="ml-auto">
          {badgeLabel
            ? badgeLabel(count)
            : count > MAX_COUNT
              ? `${MAX_COUNT}+`
              : count}
        </Badge>
      )}
    </Link>
  );
}

/**
 * A `nav` of {@link MenuLiveItemLink}s.
 *
 * @example
 * import { MenuLive } from "@chelone/react";
 *
 * <MenuLive items={[{ to: "/posts", resource: "posts", label: "Posts" }]} />
 */
function MenuLive({ items }: MenuLiveProps) {
  return (
    <nav>
      {items.map((item) => (
        <MenuLiveItemLink key={item.to} {...item} />
      ))}
    </nav>
  );
}

export { MenuLive, MenuLiveItemLink };
