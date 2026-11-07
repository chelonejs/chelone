import {
  type CheloneStore,
  clearUnread,
  isRealtimeDataProvider,
  type RealtimeDataProvider,
  type RealtimeEventType,
  subscribeUnreadCount,
  unreadKey,
} from "@chelone/core";
import { type ReactNode, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useOptionalSidebar,
} from "@/components/ui/sidebar";
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

const toEventsKey = (events: RealtimeEventType[] = ["created"]): string =>
  [...new Set(events)].sort().join(",");
const fromEventsKey = (eventsKey: string): RealtimeEventType[] =>
  eventsKey.split(",").filter(Boolean);

interface SharedSubscription {
  holders: number;
  stop: () => void;
}

const subscriptions = new WeakMap<
  CheloneStore,
  WeakMap<object, Map<string, SharedSubscription>>
>();

/**
 * Links with the same resource and events share a store key, so they share
 * one subscription: one each would add 1 per event apiece.
 */
function acquire(
  dataProvider: RealtimeDataProvider,
  store: CheloneStore,
  resource: string,
  eventsKey: string,
): () => void {
  let byProvider = subscriptions.get(store);
  if (!byProvider) {
    byProvider = new WeakMap();
    subscriptions.set(store, byProvider);
  }
  let shared = byProvider.get(dataProvider);
  if (!shared) {
    shared = new Map();
    byProvider.set(dataProvider, shared);
  }
  const subscriptionsForProvider = shared;
  const key = `${resource}\0${eventsKey}`;

  let entry = subscriptionsForProvider.get(key);
  if (!entry) {
    entry = {
      holders: 0,
      stop: subscribeUnreadCount({
        dataProvider,
        store,
        resource,
        events: fromEventsKey(eventsKey),
      }),
    };
    subscriptionsForProvider.set(key, entry);
  }
  entry.holders++;

  const held = entry;
  return () => {
    if (--held.holders > 0) return;
    held.stop();
    subscriptionsForProvider.delete(key);
  };
}

/**
 * A menu link with a badge counting the resource's new records since the user
 * last opened it. The count is kept in the store, so it survives a reload when
 * the store has an adapter. Needs a realtime data provider. Inside a sidebar it
 * is a sidebar menu button, with the label as a tooltip while the sidebar is
 * collapsed; elsewhere it is a plain link.
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
  // Sorted and joined so an inline `events` array does not resubscribe each
  // render, and a reordered one shares the subscription and the count.
  const eventsKey = toEventsKey(events);
  const [count = 0] = useStoreItem<number>(
    unreadKey(resource, fromEventsKey(eventsKey)),
  );
  const active = useMatch({ path: to, end: false }) !== null;
  const sidebar = useOptionalSidebar();

  useEffect(() => {
    if (!isRealtimeDataProvider(dataProvider)) return;
    return acquire(dataProvider, store, resource, eventsKey);
  }, [dataProvider, store, resource, eventsKey]);

  useEffect(() => {
    if (active && count > 0)
      clearUnread(store, resource, fromEventsKey(eventsKey));
  }, [active, count, store, resource, eventsKey]);

  const badge = count > 0 && (
    <Badge
      data-testid="menu-live-badge"
      className={
        sidebar
          ? // The collapsed rail clips the button to its icon, so the badge
            // moves onto the icon's corner instead of the row's end.
            "ml-auto group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:text-[10px]"
          : "ml-auto"
      }
    >
      {badgeLabel
        ? badgeLabel(count)
        : count > MAX_COUNT
          ? `${MAX_COUNT}+`
          : count}
    </Badge>
  );

  if (sidebar) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={{ children: label }}
          className="relative"
        >
          <Link to={to}>
            {icon}
            {label}
            {badge}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
    >
      {icon}
      {label}
      {badge}
    </Link>
  );
}

/**
 * A `nav` of {@link MenuLiveItemLink}s. Inside a sidebar it renders the items
 * as sidebar menu entries with no wrapper, so place it in a `<SidebarMenu>`,
 * such as a `<ResourceMenuItemGroup>`'s children.
 *
 * @example
 * import { MenuLive } from "@chelone/react";
 *
 * <MenuLive items={[{ to: "/posts", resource: "posts", label: "Posts" }]} />
 */
function MenuLive({ items }: MenuLiveProps) {
  const sidebar = useOptionalSidebar();
  const links = items.map((item) => (
    <MenuLiveItemLink key={item.to} {...item} />
  ));
  return sidebar ? links : <nav className="flex flex-col gap-1">{links}</nav>;
}

export { MenuLive, MenuLiveItemLink };
