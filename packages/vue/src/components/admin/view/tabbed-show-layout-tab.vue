<script lang="ts">
/**
 * `<TabbedShowLayoutTab>` — one tab of a `<TabbedShowLayout>`, the Vue twin of
 * `@chelone/react`'s `ShowTab`. The layout reads its props from the vnode to
 * draw the tab list and renders only the active tab, which wraps each element
 * of its default slot in a `<Labeled>`. Written as a render function because
 * the fields are read as vnodes, which a template cannot do.
 */

import {
  Comment,
  type Component,
  defineComponent,
  Fragment,
  h,
  inject,
  type InjectionKey,
  type PropType,
  Text,
  type VNode,
  type VNodeChild,
} from "vue";
import { cn } from "../../../lib/utils";
import { childVNodes } from "../../../lib/vnode-children";
import Labeled from "./labeled.vue";

/** Props for {@link TabbedShowLayoutTab}. */
export interface TabbedShowLayoutTabProps {
  /** The tab label. Translated with itself as the fallback. */
  label: string;
  /**
   * The URL segment under the show route. Defaults to the tab's index for every
   * tab after the first, and `''` (the show route itself) for the first.
   */
  path?: string;
  /** Shown after the label as `(count)`. */
  count?: number;
  /** Shown before the label: a component, rendered without props. */
  icon?: Component;
  /** Class names for the element wrapping this tab's fields. */
  contentClass?: string;
}

/** What a `<TabbedShowLayout>` hands down to the tab it renders. */
export interface TabbedShowLayoutContext {
  /** The gap between fields, in units of 4px. */
  readonly spacing: number;
  /** The layout's `#divider` slot. */
  divider?: () => VNodeChild;
}

export const TabbedShowLayoutContextKey: InjectionKey<TabbedShowLayoutContext> =
  Symbol("chelone-tabbed-show-layout");

/** The element vnodes of a slot, looking through fragments (`v-for`). */
function elementNodes(nodes: VNode[], out: VNode[] = []): VNode[] {
  for (const node of nodes) {
    if (node.type === Comment || node.type === Text) continue;
    if (node.type === Fragment) {
      elementNodes(childVNodes(node), out);
    } else {
      out.push(node);
    }
  }
  return out;
}

export default defineComponent({
  name: "TabbedShowLayoutTab",
  props: {
    label: { type: String, required: true },
    path: { type: String, default: undefined },
    count: { type: Number, default: undefined },
    icon: { type: [Object, Function] as PropType<Component>, default: undefined },
    contentClass: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const layout = inject(TabbedShowLayoutContextKey, { spacing: 4 });
    return () => {
      const fields = elementNodes(slots.default?.() ?? []);
      return h(
        "div",
        {
          class: cn("flex flex-col", props.contentClass),
          style: { gap: `${layout.spacing * 4}px` },
        },
        fields.map((field, index) =>
          h(Fragment, { key: field.key ?? index }, [
            index > 0 ? layout.divider?.() : null,
            h(Labeled, null, { default: () => field }),
          ]),
        ),
      );
    };
  },
});
</script>
