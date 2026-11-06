<script lang="ts">
import { DragDropProvider } from "@dnd-kit/vue";
import { isSortable, useSortable } from "@dnd-kit/vue/sortable";
import { defineComponent, h, ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import type {
  FieldsSelectorListProps,
  FieldsSelectorProps,
  FieldsSelectorRowProps,
} from "../admin/buttons/fields-selector.vue";
import { GripVerticalIcon } from "../admin/buttons/icons";
import Button from "../ui/button.vue";

/** Props for {@link SortableFieldsSelector}. */
export type SortableFieldsSelectorProps = Omit<
  FieldsSelectorProps,
  "listAs" | "rowAs"
>;

const SortableList = defineComponent(
  (props: FieldsSelectorListProps, { slots }) =>
    () =>
      h(
        DragDropProvider,
        {
          onDragEnd: ({ canceled, operation }) => {
            const { source } = operation;
            if (canceled || !isSortable(source)) return;
            if (source.index !== source.initialIndex) {
              props.onMove(String(source.id), source.index);
            }
          },
        },
        () => h("ul", { class: "flex flex-col gap-1" }, slots.default?.()),
      ),
  { props: ["ids", "disabled", "onMove"] },
);

const SortableRow = defineComponent(
  (props: FieldsSelectorRowProps, { slots }) => {
    const translate = useTranslate();
    const element = ref<HTMLElement>();
    const handle = ref<ComponentPublicInstance>();
    const { isDragging } = useSortable({
      id: () => props.id,
      index: () => props.index,
      disabled: () => props.disabled,
      element,
      handle,
    });
    return () =>
      h(
        "li",
        {
          ref: element,
          "data-slot": "fields-selector-row",
          "data-dragging": isDragging.value ? "" : undefined,
          class: cn(
            "flex items-center gap-2 bg-popover",
            isDragging.value && "opacity-80 shadow-md",
          ),
        },
        [
          h(
            Button,
            {
              ref: handle,
              variant: "ghost",
              size: "icon",
              "data-slot": "fields-selector-drag-handle",
              "aria-label": translate("chelone.inspector.drag_field", {
                _: "Drag to reorder",
              }),
              disabled: props.disabled,
              class: "size-7 cursor-grab touch-none active:cursor-grabbing",
            },
            () => h(GripVerticalIcon),
          ),
          slots.default?.(),
        ],
      );
  },
  { props: ["id", "index", "disabled"] },
);
</script>

<script setup lang="ts">
/**
 * `<SortableFieldsSelector>` — `<FieldsSelector>` with a grip on each row to
 * drag it into place. The Vue twin of `@chelone/react`'s
 * `SortableFieldsSelector`. Move up and Move down stay as the keyboard path,
 * and the grip is off while the list is searched, when the order on screen is
 * not the real one. The drag runs on the optional `@dnd-kit/vue` peer, which
 * needs Vue 3.5, and is why this is not part of `<ColumnsButton>`.
 *
 * @example
 * <SortableFieldsSelector store-key="posts.datatable" resource="posts" />
 */

import FieldsSelector from "../admin/buttons/fields-selector.vue";

const props = defineProps<SortableFieldsSelectorProps>();
</script>

<template>
  <FieldsSelector v-bind="props" :list-as="SortableList" :row-as="SortableRow" />
</template>
