<script lang="ts">
/**
 * `<TranslatableFieldsTabContent>` — one locale's panel. Always mounted, hidden
 * while another locale is selected. Its fields read the ambient record with
 * every translation map replaced by this locale's value. With several
 * children, each element is labeled from its own `source`. Written as a render
 * function because the children are read as vnodes, which a template cannot do.
 */

import { createLocaleSourceScope, getRecordForLocale } from "@chelone/core";
import {
  Comment,
  computed,
  defineComponent,
  Fragment,
  h,
  inject,
  Text,
  type VNode,
} from "vue";
import { provideSourceScope, useSourceScope } from "../../../form/form-context";
import { useTranslatableContext } from "../../../i18n/use-translatable";
import { cn } from "../../../lib/utils";
import { provideRecordContext, RecordContextKey } from "../../../record/record-context";
import Labeled from "./labeled.vue";

/** Props for {@link TranslatableFieldsTabContent}. */
export interface TranslatableFieldsTabContentProps {
  locale: string;
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
  class?: string;
}

/** The vnodes of a slot, text included, looking through fragments (`v-for`). */
function flatNodes(nodes: VNode[], out: VNode[] = []): VNode[] {
  for (const node of nodes) {
    if (node.type === Comment) continue;
    if (node.type === Fragment && Array.isArray(node.children)) {
      flatNodes(node.children as VNode[], out);
    } else {
      out.push(node);
    }
  }
  return out;
}

export default defineComponent({
  name: "TranslatableFieldsTabContent",
  props: {
    locale: { type: String, required: true },
    groupKey: { type: String, default: "" },
    class: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const translatable = useTranslatableContext();
    const ambient = inject(RecordContextKey, undefined);
    const hidden = computed(
      () => translatable.selectedLocale.value !== props.locale,
    );

    // An `undefined` record stays `undefined`, so the panel is empty until it loads.
    provideRecordContext(
      computed(() =>
        getRecordForLocale(ambient?.value, props.locale, translatable.locales),
      ),
    );
    provideSourceScope(createLocaleSourceScope(useSourceScope(), props.locale));

    return () => {
      const nodes = flatNodes(slots.default?.() ?? []);
      const labelEach = nodes.filter((node) => node.type !== Text).length > 1;
      return h(
        "div",
        {
          role: "tabpanel",
          "data-slot": "translatable-fields-tab-content",
          id: `translatable-content-${props.groupKey}${props.locale}`,
          "aria-labelledby": `translatable-header-${props.groupKey}${props.locale}`,
          hidden: hidden.value,
          class: cn("flex-1 outline-none", props.class),
        },
        labelEach
          ? nodes.map((node, index) =>
              node.type === Text
                ? node
                : h(
                    Labeled,
                    { key: node.key ?? index },
                    { default: () => node },
                  ),
            )
          : nodes,
      );
    };
  },
});
</script>
