<script lang="ts" generic="TRecord extends LooseRecord = LooseRecord">
import type {
  KanbanColumnDef,
  LooseRecord,
  SourceKey,
  SourceProp,
} from "@chelone/core";

/** Props for {@link KanbanBoard}. */
export interface KanbanBoardProps<
  TRecord extends LooseRecord = LooseRecord,
> {
  /**
   * The top-level field whose value names a column; a drop writes the target
   * column's `id` to it.
   */
  groupSource: SourceKey<TRecord>;
  /** The columns, in order. A record whose group value names none is not shown. */
  columns: readonly KanbanColumnDef[];
  /** The field shown as the card title; the record representation when it is null or undefined. */
  titleSource?: SourceProp<TRecord>;
  /** The field shown as a second line when its value is not empty. */
  descriptionSource?: SourceProp<TRecord>;
  /**
   * Where a card goes when nothing listens to `select-card`. `edit` by default,
   * `show` when the resource has no edit view. `false` leaves cards inert.
   */
  linkType?: "edit" | "show" | false;
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord extends LooseRecord = LooseRecord">
/**
 * `<KanbanBoard>` — the records of the ambient `<List>` as columns, one per
 * `columns` entry, with a card per record. The Vue analog of
 * `@chelone/react`'s `list/kanban-board.tsx`, over the same core
 * `buildKanbanBuckets` + `planKanbanMove` rules.
 *
 * A card moves to another column by dragging it, or with its "Move to" menu for
 * keyboard users; either writes `groupSource` through an optimistic `update`, so
 * the card changes column at once and goes back when the write fails. Dragging
 * needs `edit` access on the resource. Touch drag is not supported: the menu
 * covers touch.
 *
 * It fetches nothing and sets no `perPage`, so give the `<List>` a `perPage`
 * that covers every card. Cards keep the list's order inside a column.
 *
 * Emits `select-card` with the record when a card is activated; with no listener
 * attached the card navigates to its edit or show page. The `#card` slot
 * replaces the title and description inside a card.
 *
 * @example
 * <List :per-page="1000">
 *   <KanbanBoard
 *     group-source="status"
 *     title-source="title"
 *     :columns="[
 *       { id: 'todo', label: 'To do' },
 *       { id: 'doing', label: 'In progress' },
 *       { id: 'done', label: 'Done' },
 *     ]"
 *   />
 * </List>
 */

import {
  buildKanbanBuckets,
  getAtPath,
  type Identifier,
  planKanbanMove,
} from "@chelone/core";
import { computed, getCurrentInstance, ref, shallowRef } from "vue";
import { useResourceDefinition } from "../../../admin/resource-registry";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath, useNavigate } from "../../../router";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { useMenuAccess } from "../layout/use-menu-access";
import { ArrowRightLeftIcon } from "./list-icons";

// A `false` in the union makes Vue cast an absent prop to `false`.
const props = withDefaults(defineProps<KanbanBoardProps<TRecord>>(), {
  linkType: undefined,
  titleSource: undefined,
  descriptionSource: undefined,
});
const emit = defineEmits<{ "select-card": [record: TRecord] }>();
defineSlots<{
  /** Replaces the title and description inside a card. */
  card?(props: { record: TRecord }): unknown;
}>();

const list = useListContext();
const resource = useResourceContext();
const translate = useTranslate();
const getRepresentation = useGetRecordRepresentation(resource);
const navigate = useNavigate();
const createPath = useCreatePath();
const definition = useResourceDefinition(() => ({ resource }));
const notifications = useCheloneNotifications();
const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
  })),
);
// A missing resource dispatches no update; the call is never made below.
const update = useUpdate(resource ?? "", { mutationMode: "optimistic" });
const draggable = computed(
  () => !!resource && canAccess.value && !isAccessPending.value,
);

// Declared emits are stripped from `$attrs`, so the vnode props are the only
// place to tell whether a parent attached `@select-card`. `@select-card.once`
// compiles to `onSelectCardOnce`, which `emit` also honours.
const instance = getCurrentInstance();
const hasListener = () => {
  const listeners = instance?.vnode.props;
  return !!(listeners?.onSelectCard || listeners?.onSelectCardOnce);
};

const buckets = computed(() =>
  buildKanbanBuckets((list.data ?? []) as TRecord[], props.groupSource, props.columns),
);

// `dataTransfer.getData` is empty during `dragover`, so the held record is kept
// here. A `shallowRef` so the held record is never made reactive: it is written
// back as `previousData` exactly as the list handed it over.
const grabbed = shallowRef<TRecord | null>(null);
const draggingId = ref<string>();
const overColumn = ref<string>();
function clearDrag(): void {
  grabbed.value = null;
  draggingId.value = undefined;
  overColumn.value = undefined;
}

function move(record: TRecord, targetColumnId: string): void {
  const plan = planKanbanMove(
    record,
    props.groupSource,
    props.columns,
    targetColumnId,
  );
  if (!plan) return;
  update
    .mutateAsync(plan as unknown as Parameters<typeof update.mutateAsync>[0])
    .catch(() => {
      notifications?.notify("chelone.notification.http_error", {
        type: "error",
      });
    });
}

// A resource that registers neither view has no route to link to.
const type = computed(
  () =>
    props.linkType ??
    (definition.value.hasEdit
      ? "edit"
      : definition.value.hasShow
        ? "show"
        : false),
);
const linkTo = (record: TRecord) =>
  resource && type.value
    ? createPath({ resource, id: record.id as Identifier, type: type.value })
    : undefined;
const selectable = computed(
  () => hasListener() || (!!resource && type.value !== false),
);

function select(record: TRecord): void {
  if (!selectable.value) return;
  if (hasListener()) return emit("select-card", record);
  const to = linkTo(record);
  if (to) navigate(to);
}

function onCardKeydown(event: KeyboardEvent, record: TRecord): void {
  // The Move to menu lives inside the card; its keys are the menu's own.
  if (event.target !== event.currentTarget) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  select(record);
}

function onDragStart(event: DragEvent, record: TRecord): void {
  // A dragstart from inside the card (its text, a link in the `#card` slot) bubbles here too.
  if (!draggable.value || !event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "move";
  // Firefox starts no drag without data.
  event.dataTransfer.setData("text/plain", String(record.id));
  grabbed.value = record;
  draggingId.value = String(record.id);
}

function onDragOver(event: DragEvent, columnId: string): void {
  if (!grabbed.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  overColumn.value = columnId;
}

function onDragLeave(event: DragEvent, columnId: string): void {
  // Moving onto a child of the area fires dragleave on the area first.
  const into = event.relatedTarget;
  const area = event.currentTarget as Element | null;
  if (into instanceof Node && area?.contains(into)) return;
  if (overColumn.value === columnId) overColumn.value = undefined;
}

function onDrop(event: DragEvent, columnId: string): void {
  const record = grabbed.value;
  if (!record || !draggable.value) return;
  event.preventDefault();
  clearDrag();
  move(record, columnId);
}

const isEmpty = (value: unknown) => value == null || value === "";
const textOf = (record: TRecord, source?: SourceProp<TRecord>) =>
  source ? getAtPath(record, source) : undefined;
// The Vue representation is always a string, so the title and the Move button's
// name read the same value.
const titleOf = (record: TRecord): string => {
  const value = textOf(record, props.titleSource);
  return value == null ? getRepresentation(record) : String(value);
};
const othersOf = (columnId: string) =>
  props.columns.filter((other) => other.id !== columnId);
const moveLabel = (record: TRecord) =>
  translate("chelone.kanban_board.move", {
    title: titleOf(record),
    _: "Move {title}",
  });
// A `computed`, not a constant: `translate` only tracks the locale inside a
// computed or the template, so a `setLocale` re-renders the empty text.
const emptyLabel = computed(() =>
  translate("chelone.kanban_board.empty", { _: "No items" }),
);
</script>

<template>
  <div
    data-slot="kanban-board"
    :class="cn('flex items-start gap-4 overflow-x-auto pb-2', props.class)"
  >
    <div
      v-for="{ column, records } in buckets"
      :key="column.id"
      role="group"
      :aria-label="column.label"
      data-slot="kanban-column"
      :data-column-id="column.id"
      :class="
        cn(
          'flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/50 p-2',
          column.className,
        )
      "
    >
      <div class="flex items-center justify-between px-1 text-sm font-medium">
        <span>{{ column.label }}</span>
        <span
          data-slot="kanban-column-count"
          class="text-muted-foreground"
        >{{ records.length }}</span>
      </div>
      <div
        data-slot="kanban-column-cards"
        :data-over="overColumn === column.id ? '' : undefined"
        class="flex min-h-16 flex-col gap-2 rounded-md data-[over]:bg-accent"
        @dragover="onDragOver($event, column.id)"
        @dragleave="onDragLeave($event, column.id)"
        @drop="onDrop($event, column.id)"
      >
        <p
          v-if="records.length === 0"
          data-slot="kanban-empty"
          class="px-1 py-2 text-sm text-muted-foreground"
        >
          {{ emptyLabel }}
        </p>
        <div
          v-for="record in records"
          :key="record.id"
          role="button"
          tabindex="0"
          data-slot="kanban-card"
          :data-record-id="String(record.id)"
          :data-dragging="draggingId === String(record.id) ? '' : undefined"
          :draggable="draggable"
          class="flex cursor-pointer items-start gap-2 rounded-md border bg-card p-3 text-sm shadow-xs data-[dragging]:opacity-50"
          @click="select(record)"
          @keydown="onCardKeydown($event, record)"
          @dragstart="onDragStart($event, record)"
          @dragend="clearDrag"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <slot
              v-if="$slots.card"
              name="card"
              :record="record"
            />
            <template v-else>
              <span data-slot="kanban-card-title" class="font-medium">
                {{ titleOf(record) }}
              </span>
              <span
                v-if="!isEmpty(textOf(record, props.descriptionSource))"
                data-slot="kanban-card-description"
                class="text-muted-foreground"
              >
                {{ String(textOf(record, props.descriptionSource)) }}
              </span>
            </template>
          </div>
          <!-- The menu is not portalled, so its clicks would reach the card.
               Keys bubble: the card's handler ignores keys that do not target
               it, and `<DropdownMenu>` listens for Escape on `document`, which
               a stopped keydown would never reach. -->
          <div
            v-if="draggable"
            @click.stop
          >
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-slot="kanban-card-move"
                  class="size-6"
                  :aria-label="moveLabel(record)"
                >
                  <ArrowRightLeftIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  v-for="other in othersOf(column.id)"
                  :key="other.id"
                  @select="move(record, other.id)"
                >
                  {{ other.label }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
