<script lang="ts">
/** Props for {@link Configurable}. */
export interface ConfigurableProps {
  /** Names this piece, so a stale unmount cannot clear another's selection. */
  preferenceKey: string;
  /** The panel's title while this is selected. */
  title?: string;
  /** A message key for the Customize button, translated with itself as the fallback. */
  openButtonLabel?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Configurable>` — marks a piece of the page as configurable. While the
 * inspector's configure mode is on it is outlined and shows a Customize button
 * that opens its `#editor` slot in the panel. The Vue twin of
 * `@chelone/react`'s `Configurable`. Without an `<Inspector>` it renders its
 * default slot and nothing else.
 *
 * The wrapper is there whether or not the mode is on, so turning it on never
 * remounts the content.
 *
 * The panel renders the editor, so the editor reads the contexts around the
 * `<Inspector>`, not the ones around this: give it a `resource` rather than
 * counting on an ambient `<Resource>`.
 *
 * @example
 * <Configurable preference-key="posts.columns" title="Columns">
 *   <PostTable />
 *   <template #editor>
 *     <SortableFieldsSelector store-key="posts.datatable" resource="posts" />
 *   </template>
 * </Configurable>
 */

import { computed, onScopeDispose, type VNode, watch } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { SlidersHorizontalIcon } from "../admin/buttons/icons";
import Button from "../ui/button.vue";
import { type InspectorEditor, useInspector } from "./inspector-context";

const props = defineProps<ConfigurableProps>();
const slots = defineSlots<{
  default?: () => VNode[];
  editor?: () => VNode[];
}>();

const translate = useTranslate();
const inspector = useInspector();

const defaultOpenLabel = "chelone.inspector.customize";
const enabled = computed(() => inspector?.value.enabled ?? false);
const isSelected = computed(
  () => inspector?.value.selected?.key === props.preferenceKey,
);

// Reads the slot when called, so the panel follows a slot that changes.
const editor: InspectorEditor = () => slots.editor?.() ?? [];

function open() {
  inspector?.value.select({
    key: props.preferenceKey,
    title: props.title,
    editor,
  });
}

watch(
  () => props.preferenceKey,
  (_next, previous) => inspector?.value.release(previous),
);
onScopeDispose(() => inspector?.value.release(props.preferenceKey));

// The panel keeps the title it was given, so a new one has to be handed over.
watch(
  [() => inspector?.value.selected, () => props.title],
  ([selected, title]) => {
    if (selected?.key === props.preferenceKey && selected.title !== title) {
      open();
    }
  },
);
</script>

<template>
  <div
    v-if="inspector"
    data-slot="configurable"
    :data-inspector-enabled="enabled ? '' : undefined"
    :data-selected="isSelected ? '' : undefined"
    :class="
      cn(
        'group/configurable relative data-[inspector-enabled]:rounded-md data-[inspector-enabled]:outline-2 data-[inspector-enabled]:outline-dashed data-[inspector-enabled]:outline-primary/40 data-[selected]:outline-solid data-[selected]:outline-primary',
        props.class,
      )
    "
  >
    <slot />
    <Button
      v-if="enabled"
      size="sm"
      class="absolute top-1 right-1 z-10 h-6 gap-1 px-2 text-xs opacity-0 focus-visible:opacity-100 group-focus-within/configurable:opacity-100 group-hover/configurable:opacity-100 group-data-[selected]/configurable:opacity-100"
      @click="open"
    >
      <SlidersHorizontalIcon />
      {{
        translate(props.openButtonLabel ?? defaultOpenLabel, {
          _: props.openButtonLabel ?? "Customize",
        })
      }}
    </Button>
  </div>
  <slot v-else />
</template>
