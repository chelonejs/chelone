<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";

/** Props for {@link WrapperField}. */
export interface WrapperFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  /**
   * A pseudo field path exposed to a parent layout (e.g. a sortable
   * `DataTable` header). Not read by the field itself — it only groups children.
   */
  source?: SourceProp<RecordType>;
  label?: string | false;
  record?: RecordType;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { VNode } from "vue";
/**
 * `<WrapperField>` — wraps several fields so a parent layout (a
 * `SimpleShowLayout`, a `DataTable`) can treat them as one labeled/sortable unit
 * while they render together. The Vue analog of `@chelone/react`'s
 * `fields/wrapper-field.tsx` (a `<>{children}</>` passthrough).
 *
 * Idiom translation from the twin: React returns a Fragment of `children`. Vue
 * renders the DEFAULT SLOT with no wrapper element — a faithful passthrough. The
 * layout-level props (`source`, `label`) are inert here; the parent reads them
 * off the vnode/definition to build its header.
 */

defineProps<WrapperFieldProps<RecordType>>();

defineSlots<{
  /** The wrapped fields, rendered as-is. */
  default(): VNode[];
}>();
</script>

<template>
  <slot />
</template>
