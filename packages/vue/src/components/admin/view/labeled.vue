<script lang="ts">
/**
 * `<Labeled>` — labels a plain field from its `source`, for layouts that do not
 * wrap every field in a `<RecordField>` (tabbed show, translatable fields). The
 * Vue twin of `@chelone/react`'s `view/labeled.tsx`.
 *
 * Idiom translation from the twin: React reads the props of its one `children`
 * element; Vue reads the props of the first vnode in the default slot, which
 * only a render function can inspect (hence no `<script setup>`). The label is
 * skipped when `label` is `false`, the child's `label` is `false`, or the child
 * is a native element, a `<Labeled>` or a `<RecordField>`, which label
 * themselves.
 */

import type { SourceProp } from "@chelone/core";
import {
  Comment,
  defineComponent,
  Fragment,
  getCurrentInstance,
  h,
  type PropType,
  type VNode,
} from "vue";
import { cn } from "../../../lib/utils";
import { childVNodes } from "../../../lib/vnode-children";
import FieldLabelText from "../common/field-label-text.vue";
import RecordField from "../fields/record-field.vue";

/** Props for {@link Labeled}. */
export interface LabeledProps {
  /** Overrides the child's `label`; `false` renders no label. */
  label?: string | false;
  /** Overrides the child's `source` when resolving the label. */
  source?: SourceProp;
  /** Overrides the child's `resource` when resolving the label. */
  resource?: string;
  isRequired?: boolean;
  /** Makes the label a `<label>` for the control with this id. */
  htmlFor?: string;
  fullWidth?: boolean;
  /** The wrapper element. Defaults to `div`. */
  as?: string;
  class?: string;
}

/** The first real vnode of the slot, looking through fragments (`v-for`). */
function firstNode(nodes: VNode[]): VNode | undefined {
  for (const node of nodes) {
    if (node.type === Comment) continue;
    if (node.type === Fragment) {
      const inner = firstNode(childVNodes(node));
      if (inner) return inner;
    } else {
      return node;
    }
  }
  return undefined;
}

export default defineComponent({
  name: "Labeled",
  props: {
    // `false` in the type makes Vue cast an ABSENT label to `false`; the
    // explicit `undefined` default keeps absent distinct from `:label="false"`.
    label: {
      // type-escape: prop: Vue's documented way to type a runtime prop.
      type: [String, Boolean] as PropType<string | false>,
      default: undefined,
    },
    source: {
      // type-escape: prop: Vue's documented way to type a runtime prop.
      type: String as PropType<SourceProp>,
      default: undefined,
    },
    resource: { type: String, default: undefined },
    isRequired: { type: Boolean, default: false },
    htmlFor: { type: String, default: undefined },
    fullWidth: { type: Boolean, default: false },
    as: { type: String, default: "div" },
    class: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const self = getCurrentInstance()?.type;
    return () => {
      const child = firstNode(slots.default?.() ?? []);
      const childProps = child?.props ?? {};
      // Text and native elements have a string or symbol type.
      const labelsItself =
        child != null &&
        (typeof child.type === "string" ||
          typeof child.type === "symbol" ||
          child.type === RecordField ||
          child.type === self);
      const showLabel =
        !labelsItself && props.label !== false && childProps.label !== false;
      return h(
        props.as,
        {
          "data-slot": "labeled",
          class: cn(
            "flex flex-col gap-1",
            props.fullWidth && "w-full",
            props.class,
          ),
        },
        [
          showLabel
            ? h(
                "label",
                { for: props.htmlFor, class: "text-xs text-muted-foreground" },
                h(FieldLabelText, {
                  label: props.label ?? childProps.label,
                  source: props.source ?? childProps.source,
                  resource: props.resource ?? childProps.resource,
                  isRequired: props.isRequired,
                }),
              )
            : null,
          slots.default?.(),
        ],
      );
    };
  },
});
</script>
