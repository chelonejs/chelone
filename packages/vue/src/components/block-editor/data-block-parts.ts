import type { BlockAttrs, BlockSpec } from "@chelone/core";
import {
  computed,
  type FunctionalComponent,
  h,
  type MaybeRefOrGetter,
  toValue,
} from "vue";
import { useTranslate } from "../../i18n/use-translate";
import type { BlockDefinition, BlockRenderProps } from "./block-nodes";

/** The attrs a block spec's schema outputs. */
export type AttrsOf<S extends BlockSpec> =
  S extends BlockSpec<infer A> ? A : never;

/**
 * What a data block shows in place of its data while it has none to draw: a
 * hint until configured, or a failure. `null` once there is data to draw. Keys
 * are `chelone.block_editor.<name>.empty` and `.error`.
 */
export function useDataBlockGate(
  name: "referenceRecord" | "recordList" | "chart",
  state: {
    configured: MaybeRefOrGetter<boolean>;
    isError: MaybeRefOrGetter<boolean>;
  },
  fallback: { empty: string; error: string },
) {
  const translate = useTranslate();
  return computed<{ kind: "empty" | "error"; message: string } | null>(() => {
    if (!toValue(state.configured)) {
      return {
        kind: "empty",
        message: translate(`chelone.block_editor.${name}.empty`, {
          _: fallback.empty,
        }),
      };
    }
    if (toValue(state.isError)) {
      return {
        kind: "error",
        message: translate(`chelone.block_editor.${name}.error`, {
          _: fallback.error,
        }),
      };
    }
    return null;
  });
}

/**
 * A view that remounts when the block's resource changes: the data hooks read
 * the resource once, at setup.
 */
export function keyedByResource<A extends BlockAttrs & { resource: string }>(
  view: BlockDefinition<A>["render"],
): FunctionalComponent<BlockRenderProps<A>> {
  return (props) => h(view, { ...props, key: props.attrs.resource });
}
