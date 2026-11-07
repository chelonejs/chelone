<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";
import type { BlockDefinition } from "./block-nodes";

/** Props for {@link BlockDocField}. */
export interface BlockDocFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  /** Read once, when the editor mounts. Each block's `read` component draws it. */
  blocks?: readonly BlockDefinition[];
  /** Shown as text when the value is missing; translated if it is a message key. */
  empty?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<BlockDocField>` — shows a stored block document read-only, drawing each
 * block with its `read` component. The Vue twin of `@chelone/react`'s
 * `block-editor/block-doc-field.tsx`. The `#empty` slot replaces the `empty`
 * text when the value is missing.
 *
 * Needs the optional `@tiptap/*` peers.
 *
 * @example
 * import { BlockDocField } from "@chelone/vue/block-editor";
 *
 * <BlockDocField source="body" :blocks="[callout]" empty="No content" />
 */

import { isBlockDoc } from "@chelone/core";
import { computed, type VNode } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import BlockEditor from "./block-editor.vue";

const props = defineProps<BlockDocFieldProps<RecordType>>();

defineSlots<{ empty?: () => VNode[] }>();

const translate = useTranslate();
const stored = useFieldValue<RecordType>({
  get record() {
    return props.record;
  },
  source: props.source,
});
const doc = computed(() => (isBlockDoc(stored.value) ? stored.value : null));
</script>

<template>
  <div
    v-if="doc"
    data-slot="block-doc-field"
    :class="cn(props.class)"
  >
    <BlockEditor :value="doc" :blocks="blocks" :editable="false" />
  </div>
  <slot v-else name="empty">{{
    empty ? translate(empty, { _: empty }) : ""
  }}</slot>
</template>
