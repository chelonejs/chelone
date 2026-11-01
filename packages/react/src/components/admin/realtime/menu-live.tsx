import {
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
  const eventsKey = events?.join(",");

  useEffect(() => {
    return subscribeUnreadCount({
      dataProvider: dataProvider as RealtimeDataProvider,
      store,
      resource,
      events: eventsKey?.split(",") as RealtimeEventType[] | undefined,
    });
  }, [dataProvider, store, resource, eventsKey]);

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
