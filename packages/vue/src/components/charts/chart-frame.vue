<script lang="ts">
/**
 * The shell the chart components share, the Vue twin of `@chelone/react`'s
 * `charts/chart-frame.tsx`: a card with an optional title, or none when
 * `bare`, around the chart, a skeleton while `loading` or the empty text.
 * A render function, so `bare` can drop the card without a second copy of the
 * body.
 */

import { defineComponent, h } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Skeleton from "../ui/skeleton.vue";

export default defineComponent({
  name: "ChartFrame",
  props: {
    /** The `data-slot` of the element that holds the chart, its skeleton or its empty text. */
    dataSlot: { type: String, required: true },
    title: { type: String, default: undefined },
    bare: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    /** No number to draw: shows the empty text in place of the chart. */
    empty: { type: Boolean, default: false },
    height: { type: Number, required: true },
    class: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const translate = useTranslate();

    return () => {
      const style = { height: `${props.height}px` };
      const body = props.loading
        ? h(Skeleton, { style })
        : props.empty
          ? h(
              "div",
              {
                "data-slot": "chart-empty",
                class:
                  "flex items-center justify-center text-sm text-muted-foreground",
                style,
              },
              translate("chelone.chart.empty", { _: "No data" }),
            )
          : slots.default?.();

      if (props.bare) {
        return h("div", { "data-slot": props.dataSlot, class: props.class }, body);
      }
      return h(
        Card,
        { class: props.class },
        () => [
          props.title
            ? h(CardHeader, null, () => h(CardTitle, null, () => props.title))
            : null,
          h(CardContent, null, () =>
            h("div", { "data-slot": props.dataSlot }, body),
          ),
        ],
      );
    };
  },
});
</script>
