<script lang="ts">
/**
 * `<TabbedShowLayout>` — groups a show view's fields into tabs, each field
 * labeled from its `source`. The Vue twin of `@chelone/react`'s
 * `views/tabbed-show-layout.tsx`. Tabs are the `<TabbedShowLayoutTab>` vnodes of
 * the default slot, flattened through fragments (`v-for`), so this is a render
 * function. Renders nothing until the record context has a record.
 *
 * With `syncWithLocation` (the default) the show route ends in a catch-all and
 * each tab is a path under the show route: the pathname minus the catch-all's
 * segments. A tab's segment is its `path`, else its index for every tab after
 * the first, else `''` for the first. The active tab is the first whose path
 * equals the pathname, else the first tab. The strip is native buttons: Vue
 * ships no `ui/tabs`, as `TabbedFormHeader` is hand-rolled too.
 */

import {
  type Component,
  defineComponent,
  Fragment,
  h,
  inject,
  provide,
  ref,
  type SlotsType,
  type VNode,
} from "vue";
import { decodePath, splatBase } from "../../../form/splat-base";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { childVNodes } from "../../../lib/vnode-children";
import { RecordContextKey } from "../../../record/record-context";
import { useRouterAdapter } from "../../../router/adapter";
import TabbedShowLayoutTab, {
  TabbedShowLayoutContextKey,
} from "./tabbed-show-layout-tab.vue";

/** Props for {@link TabbedShowLayout}. */
export interface TabbedShowLayoutProps {
  /** The gap between a tab's fields, in units of 4px. Defaults to 4. */
  spacing?: number;
  /**
   * Follow the URL (default `true`): the active tab comes from the location
   * under the show route and a change navigates there, keeping the query
   * string. `false` keeps the active tab in local state.
   */
  syncWithLocation?: boolean;
  /** The active tab's URL segment. Overrides both modes. */
  value?: string;
}

/** What a tab list needs to draw one tab. */
export interface TabbedShowLayoutTabDescriptor {
  /** The tab's URL segment, also what `goToTab` takes. */
  value: string;
  label: string;
  icon?: Component;
  count?: number;
}

/** The scope of the `#tabs` slot. */
export interface TabbedShowLayoutTabsSlotProps {
  tabs: TabbedShowLayoutTabDescriptor[];
  /** The active tab's URL segment. */
  activeTab: string;
  goToTab: (value: string) => void;
}

/** The tab vnodes of a slot, looking through fragments (`v-for`). */
function collectTabs(nodes: VNode[], out: VNode[] = []): VNode[] {
  for (const node of nodes) {
    if (node.type === Fragment) {
      collectTabs(childVNodes(node), out);
    } else if (node.type === TabbedShowLayoutTab) {
      out.push(node);
    }
  }
  return out;
}

const encodeSegment = (segment: string) =>
  segment.split("/").map(encodeURIComponent).join("/");

const samePath = (path: string) => path.replace(/\/+$/, "").toLowerCase();

let nextId = 0;

export default defineComponent({
  name: "TabbedShowLayout",
  props: {
    spacing: { type: Number, default: 4 },
    syncWithLocation: { type: Boolean, default: true },
    value: { type: String, default: undefined },
  },
  slots: Object as SlotsType<{
    default?: () => VNode[];
    tabs?: (scope: TabbedShowLayoutTabsSlotProps) => VNode[];
    divider?: () => VNode[];
  }>,
  setup(props, { slots }) {
    const adapter = useRouterAdapter();
    const location = adapter.useLocation();
    const params = adapter.useParams();
    const navigate = adapter.useNavigate();
    const translate = useTranslate();
    const record = inject(RecordContextKey, null);
    const local = ref<string>();
    const id = `chelone-show-tabs-${nextId++}`;

    provide(TabbedShowLayoutContextKey, {
      get spacing() {
        return props.spacing;
      },
      divider: () => slots.divider?.(),
    });

    return () => {
      if (!record?.value) return null;

      const tabNodes = collectTabs(slots.default?.() ?? []);
      const segments = tabNodes.map((node, index) =>
        node.props?.path != null
          ? String(node.props.path)
          : index > 0
            ? String(index)
            : "",
      );

      const base = splatBase(
        location.value.pathname,
        params.value["*"] ?? "",
      );
      const segmentPath = (segment: string) =>
        segment === "" ? base || "/" : `${base}/${encodeSegment(segment)}`;

      // Compared literally and decoded on both sides, as `TabbedForm` does: a
      // record id or tab path is data, and `matchPath` would read a `?`, a
      // leading `:` or a trailing `*` in it as pattern syntax.
      const here = samePath(decodePath(location.value.pathname));
      const requested =
        props.value ??
        (props.syncWithLocation
          ? segments.find(
              (segment) => samePath(decodePath(segmentPath(segment))) === here,
            )
          : local.value);
      const active =
        requested !== undefined && segments.includes(requested)
          ? requested
          : (segments[0] ?? "");

      const goToTab = (next: string) => {
        if (props.syncWithLocation) {
          navigate(`${segmentPath(next)}${location.value.search}`);
        } else {
          local.value = next;
        }
      };

      const descriptors = tabNodes.map(
        (node, index): TabbedShowLayoutTabDescriptor => ({
          value: segments[index] ?? "",
          label: String(node.props?.label),
          icon: node.props?.icon,
          count: node.props?.count,
        }),
      );

      const activeIndex = segments.indexOf(active);
      const activeNode = tabNodes[activeIndex];

      return h("div", { "data-slot": "tabbed-show-layout" }, [
        slots.tabs
          ? slots.tabs({ tabs: descriptors, activeTab: active, goToTab })
          : h(
              "div",
              {
                role: "tablist",
                class:
                  "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
              },
              descriptors.map((tab, index) => {
                const selected = tab.value === active;
                return h(
                  "button",
                  {
                    key: tab.value,
                    type: "button",
                    role: "tab",
                    id: `${id}-tab-${index}`,
                    "aria-selected": selected,
                    "aria-controls": selected ? `${id}-panel` : undefined,
                    "data-state": selected ? "active" : "inactive",
                    class: cn(
                      "inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0",
                      selected && "bg-background text-foreground shadow-sm",
                    ),
                    onClick: () => goToTab(tab.value),
                  },
                  [
                    tab.icon ? h(tab.icon) : null,
                    h("span", [
                      translate(tab.label, { _: tab.label }),
                      tab.count != null ? ` (${tab.count})` : null,
                    ]),
                  ],
                );
              }),
            ),
        activeNode
          ? h(
              "div",
              {
                key: active,
                role: "tabpanel",
                id: `${id}-panel`,
                "aria-labelledby": slots.tabs ? undefined : `${id}-tab-${activeIndex}`,
                class: "mt-2",
              },
              [activeNode],
            )
          : null,
      ]);
    };
  },
});
</script>
