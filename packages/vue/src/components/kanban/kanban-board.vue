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
 * A card moves to another column by dragging it with mouse, touch or pen, or
 * with its "Move to" menu for keyboard users; either writes `groupSource`
 * through an optimistic `update`, so the card changes column at once and goes
 * back when the write fails. Dragging needs `edit` access on the resource. A
 * touch drag starts after a short hold, so a swipe still scrolls the board.
 * Dragging runs on `@dnd-kit/vue`, an optional peer that needs Vue 3.5.
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
import { PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/vue";
import { computed, getCurrentInstance } from "vue";
import { useResourceDefinition } from "../../admin/resource-registry";
import { useCheloneNotifications } from "../../context";
import { useUpdate } from "../../data/mutations";
import { useTranslate } from "../../i18n/use-translate";
import { useGetRecordRepresentation } from "../../label/use-get-record-representation";
import { cn } from "../../lib/utils";
import { useListContext } from "../../list/list-context";
import { useResourceContext } from "../../resource-context";
import { useCreatePath, useNavigate } from "../../router";
import Button from "../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useMenuAccess } from "../admin/layout/use-menu-access";
import { ArrowRightLeftIcon } from "../admin/list/list-icons";
import KanbanDraggableCard from "./kanban-draggable-card.vue";
import KanbanDropArea from "./kanban-drop-area.vue";

// Pointer events cover mouse, touch and pen. The keyboard sensor stays off:
// Enter and Space select a card, and the Move to menu is the keyboard path.
const sensors = [PointerSensor];

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

// The root is `DragDropProvider`, which renders a fragment, so attributes would
// fall through to it and be dropped. They belong on the board element.
defineOptions({ inheritAttrs: false });

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

function onDragEnd(event: {
  canceled: boolean;
  operation: {
    source: { id: string | number } | null;
    target: { id: string | number } | null;
  };
}): void {
  const { source, target } = event.operation;
  if (event.canceled || !source || !target || !draggable.value) return;
  const record = buckets.value
    .flatMap((bucket) => bucket.records)
    .find((candidate) => String(candidate.id) === String(source.id));
  if (record) move(record, String(target.id));
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
  <DragDropProvider
    :sensors="sensors"
    @drag-end="onDragEnd"
  >
    <div
      v-bind="$attrs"
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
        <KanbanDropArea
          :column-id="column.id"
          data-slot="kanban-column-cards"
          class="flex min-h-16 flex-col gap-2 rounded-md data-[over]:bg-accent"
        >
          <p
            v-if="records.length === 0"
            data-slot="kanban-empty"
            class="px-1 py-2 text-sm text-muted-foreground"
          >
            {{ emptyLabel }}
          </p>
          <KanbanDraggableCard
            v-for="record in records"
            :key="record.id"
            :id="String(record.id)"
            :draggable="draggable"
            role="button"
            tabindex="0"
            data-slot="kanban-card"
            :data-record-id="String(record.id)"
            class="flex cursor-pointer items-start gap-2 rounded-md border bg-card p-3 text-sm shadow-xs data-[dragging]:opacity-50"
            @click="select(record)"
            @keydown="onCardKeydown($event, record)"
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
        </KanbanDraggableCard>
      </KanbanDropArea>
    </div>
  </div>
  </DragDropProvider>
</template>
