<script lang="ts">
import {
  assertRealtimeDataProvider,
  type CheloneStore,
  clearUnread,
  type RealtimeDataProvider,
  type RealtimeEventType,
  subscribeUnreadCount,
  unreadKey,
} from "@chelone/core";
import {
  type Component,
  computed,
  defineComponent,
  h,
  type PropType,
  shallowRef,
  watchEffect,
} from "vue";
import { RouterLink } from "vue-router";
import { useCheloneContext, useCheloneStore } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useMatch } from "../../../router";
import { Badge } from "../../ui/badge";

/** Props for {@link MenuLiveItemLink}, and the shape of one `<MenuLive>` item. */
export interface MenuLiveItemLinkProps {
  /** Route the link navigates to. The count clears while it, or a child route of it, is active. */
  to: string;
  /** The resource whose events are counted. Read once, in `setup`. */
  resource: string;
  /** Link text. Translated, with the string itself as the fallback. */
  label: string;
  /** Icon component rendered before the label. Provide the `#icon` slot instead for markup. */
  icon?: Component;
  /** Event types that count as new. Defaults to `["created"]`. */
  events?: RealtimeEventType[];
  /** Formats the badge text. Defaults to the count, capped at `99+`. */
  badgeLabel?: (count: number) => string;
}

/** Props for {@link MenuLive}. */
export interface MenuLiveProps {
  items: MenuLiveItemLinkProps[];
}

interface SharedSubscription {
  holders: number;
  stop: () => void;
}

const subscriptions = new WeakMap<
  CheloneStore,
  WeakMap<object, Map<string, SharedSubscription>>
>();

const toEventsKey = (events: RealtimeEventType[]): string =>
  [...new Set(events)].sort().join(",");
const fromEventsKey = (eventsKey: string): RealtimeEventType[] =>
  eventsKey.split(",").filter(Boolean);

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
 * A menu link with a badge counting the resource's new records. The count
 * lives in the store, so it survives a remount; it clears while the link's
 * route is active. Divergence from the React twin: the render props are slots.
 * Declared as a render component so the file can also hold {@link MenuLive}.
 */
export const MenuLiveItemLink = defineComponent({
  name: "MenuLiveItemLink",
  props: {
    to: { type: String, required: true },
    resource: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: [Object, Function] as PropType<Component>, default: undefined },
    events: {
      type: Array as PropType<RealtimeEventType[]>,
      default: () => ["created"],
    },
    badgeLabel: {
      type: Function as PropType<(count: number) => string>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const { dataProvider } = useCheloneContext();
    const store = useCheloneStore();
    const translate = useTranslate();
    // `end: false`, so `/posts` is active on `/posts/1` but not on `/posts-archive`.
    const match = useMatch({ path: props.to, end: false });

    const eventsKey = computed(() => toEventsKey(props.events));
    const events = computed(() => fromEventsKey(eventsKey.value));

    const count = shallowRef<number | undefined>(undefined);
    watchEffect((onCleanup) => {
      const key = unreadKey(props.resource, events.value);
      const read = () => store.getItem<number>(key) ?? 0;
      count.value = read();
      onCleanup(
        store.subscribe(key, () => {
          count.value = read();
        }),
      );
    });

    watchEffect((onCleanup) => {
      assertRealtimeDataProvider(dataProvider, "<MenuLiveItemLink>");
      onCleanup(acquire(dataProvider, store, props.resource, eventsKey.value));
    });

    // Also runs when an event lands while the route is active.
    watchEffect(() => {
      if (match.value && count.value)
        clearUnread(store, props.resource, events.value);
    });

    return () => {
      const n = count.value ?? 0;
      const text = translate(props.label, { _: props.label });
      return h(
        RouterLink,
        {
          to: props.to,
          class:
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
        },
        () => [
          props.icon ? h(props.icon) : null,
          slots.icon?.(),
          h("span", { class: "flex-1" }, text),
          n > 0
            ? h(
                Badge,
                { "data-testid": "menu-live-badge" },
                () => props.badgeLabel?.(n) ?? (n > 99 ? "99+" : String(n)),
              )
            : null,
        ],
      );
    };
  },
});
</script>

<script setup lang="ts">
/**
 * `<MenuLive>` — a list of {@link MenuLiveItemLink}s, one per item.
 */

defineProps<MenuLiveProps>();
</script>

<template>
  <nav class="flex flex-col gap-1">
    <MenuLiveItemLink v-for="item in items" :key="item.to" v-bind="item" />
  </nav>
</template>
