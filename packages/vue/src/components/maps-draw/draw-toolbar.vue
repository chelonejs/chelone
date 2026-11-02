<script lang="ts">
import type { DrawTool } from "./use-terra-draw";

/** Props for {@link DrawToolbar}. */
export interface DrawToolbarProps {
  /** The buttons, in order. `delete` is an action on the selected feature, not a tool. */
  tools: readonly (DrawTool | "delete")[];
  /** The pressed tool, or `null`. */
  active: DrawTool | null;
  /** Enables the `delete` button. Defaults to false. */
  canDelete?: boolean;
  /** Disables every button. */
  disabled?: boolean;
  class?: string;
}

const LABELS: Record<DrawTool | "delete", string> = {
  "draw-point": "Draw a point",
  "draw-line": "Draw a line",
  "draw-polygon": "Draw a polygon",
  "draw-rectangle": "Draw a rectangle",
  "draw-circle": "Draw a circle",
  edit: "Edit",
  move: "Move",
  delete: "Delete",
};
</script>

<script setup lang="ts">
/**
 * The tool buttons of a drawing input. Each carries `aria-pressed`, and
 * pressing the active tool clears it by emitting `update:active` with `null`.
 * `delete` is an action: it emits `delete` and stays disabled until `canDelete`.
 *
 * @example
 * <DrawToolbar
 *   v-model:active="tool"
 *   :tools="['draw-polygon', 'edit', 'delete']"
 *   :can-delete="selected !== null"
 *   @delete="remove"
 * />
 */

import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import Button from "../ui/button.vue";
import { DrawIcon } from "./draw-icons";

const props = withDefaults(defineProps<DrawToolbarProps>(), {
  canDelete: false,
  disabled: false,
});

const emit = defineEmits<{
  /** The pressed tool, or `null` when the active one is pressed again. */
  "update:active": [tool: DrawTool | null];
  /** The `delete` button was pressed. */
  delete: [];
}>();

const translate = useTranslate();

const labelOf = (id: DrawTool | "delete") =>
  translate(`chelone.map.tool.${id.replace("-", "_")}`, { _: LABELS[id] });
</script>

<template>
  <div
    role="toolbar"
    data-slot="draw-toolbar"
    :aria-label="translate('chelone.map.toolbar', { _: 'Map tools' })"
    :class="cn('flex flex-wrap items-center gap-1', props.class)"
  >
    <template v-for="id in props.tools" :key="id">
      <Button
        v-if="id === 'delete'"
        variant="outline"
        size="icon"
        class="size-8"
        :aria-label="labelOf(id)"
        :title="labelOf(id)"
        :disabled="props.disabled || !props.canDelete"
        @click="emit('delete')"
      >
        <DrawIcon :name="id" />
      </Button>
      <Button
        v-else
        :variant="id === props.active ? 'default' : 'outline'"
        size="icon"
        class="size-8"
        :aria-label="labelOf(id)"
        :title="labelOf(id)"
        :aria-pressed="id === props.active"
        :disabled="props.disabled"
        @click="emit('update:active', id === props.active ? null : id)"
      >
        <DrawIcon :name="id" />
      </Button>
    </template>
  </div>
</template>
