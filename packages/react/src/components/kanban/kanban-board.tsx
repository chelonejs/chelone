import {
  buildKanbanBuckets,
  getAtPath,
  isLooseRecord,
  type KanbanColumnDef,
  type LooseRecord,
  planKanbanMove,
  type ResourceRecord,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { Accessibility, PointerSensor } from "@dnd-kit/dom";
import {
  DragDropProvider,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { ArrowRightLeftIcon } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListContext } from "../../form";
import { useUpdate } from "../../hooks";
import { useTranslate } from "../../i18n-hooks";
import {
  useGetRecordRepresentation,
  useGetRecordRepresentationText,
} from "../../label";
import { cn } from "../../lib/utils";
import { useNotify } from "../../notification-hooks";
import { useResourceContext, useResourceDefinition } from "../../resource";
import { useCreatePath, useNavigate } from "../../router";
import { useMenuAccess } from "../admin/layout/use-menu-access";

export interface KanbanBoardProps<
  TRecord extends ResourceRecord = LooseRecord,
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
  /** Replaces the title and description inside a card. */
  cardRenderer?: (record: TRecord) => ReactNode;
  /** Called with the record when a card is selected, in place of navigating. */
  onSelectCard?: (record: TRecord) => void;
  /**
   * Where a card goes when `onSelectCard` is not given. `edit` by default,
   * `show` when the resource has no edit view. `false` leaves cards inert.
   */
  linkType?: "edit" | "show" | false;
  className?: string;
}

// type-escape: server: getAtPath reads a record by a runtime path and returns unknown
const isEmpty = (value: unknown) => value == null || value === "";

// Enter and Space select a card, so the keyboard sensor stays off: the "Move to"
// menu is the keyboard path.
const SENSORS = [PointerSensor];
// Without the keyboard sensor, the Accessibility plugin would still tag a card
// "draggable" or "disabled" and tell a screen reader to press Space, which selects.
const PLUGINS: ComponentProps<typeof DragDropProvider>["plugins"] = (
  defaults,
) => defaults.filter((plugin) => plugin !== Accessibility);

/** The card area of a column: a drop target that marks itself while a card is over it. */
function KanbanColumnCards({
  columnId,
  children,
}: {
  columnId: string;
  children: ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({ id: columnId });
  return (
    <div
      ref={ref}
      data-slot="kanban-column-cards"
      data-over={isDropTarget ? "" : undefined}
      className="flex min-h-16 flex-col gap-2 rounded-md data-[over]:bg-accent"
    >
      {children}
    </div>
  );
}

/** A card that a pointer drags, whether mouse, touch or pen, when `draggable` is set. */
function KanbanCardShell({
  recordId,
  draggable,
  children,
  ...props
}: {
  recordId: string | number;
  draggable: boolean;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "ref" | "draggable">) {
  const { ref, isDragging } = useDraggable({
    id: recordId,
    disabled: !draggable,
  });
  return (
    <div
      ref={ref}
      data-slot="kanban-card"
      data-record-id={String(recordId)}
      data-draggable={draggable ? "" : undefined}
      data-dragging={isDragging ? "" : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The records of the ambient `<List>` as columns, one per `columns` entry, with
 * a card per record. A card moves to another column by dragging it, or with its
 * "Move to" menu for keyboard users; either writes `groupSource` through an
 * optimistic `update`, so the card changes column at once and goes back when
 * the write fails. Dragging needs `edit` access on the resource. It uses
 * pointer events, so mouse, touch and pen all drag; a touch drags after a
 * short hold, so a swipe still scrolls the board.
 *
 * It fetches nothing and sets no `perPage`, so give the `<List>` a `perPage`
 * that covers every card. Cards keep the list's order inside a column.
 *
 * @example
 * <List perPage={1000}>
 *   <KanbanBoard
 *     groupSource="status"
 *     titleSource="title"
 *     columns={[
 *       { id: "todo", label: "To do" },
 *       { id: "doing", label: "In progress" },
 *       { id: "done", label: "Done" },
 *     ]}
 *   />
 * </List>
 */
function KanbanBoard<TRecord extends ResourceRecord = LooseRecord>({
  groupSource,
  columns,
  titleSource,
  descriptionSource,
  cardRenderer,
  onSelectCard,
  linkType,
  className,
}: KanbanBoardProps<TRecord>) {
  const { data } = useListContext<TRecord>();
  const resource = useResourceContext();
  const translate = useTranslate();
  const notify = useNotify();
  const getRepresentation = useGetRecordRepresentation(resource);
  const getRepresentationText = useGetRecordRepresentationText(resource);
  const navigate = useNavigate();
  const createPath = useCreatePath();
  const { hasEdit, hasShow } = useResourceDefinition({ resource });
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
  });
  const { mutateAsync } = useUpdate(resource ?? "", {
    mutationMode: "optimistic",
  });
  const draggable = !!resource && canAccess && !isAccessPending;

  const buckets = useMemo(
    () => buildKanbanBuckets(data ?? [], groupSource, columns),
    [data, groupSource, columns],
  );

  const move = (record: TRecord, targetColumnId: string) => {
    // `update` carries the record as the data provider takes it: every field,
    // not only the ones the board's type names. The plan keeps `TRecord`, so
    // `groupSource` still matches it.
    if (!isLooseRecord(record)) return;
    const plan = planKanbanMove<TRecord>(
      record,
      groupSource,
      columns,
      targetColumnId,
    );
    if (!plan) return;
    mutateAsync({
      id: plan.id,
      data: plan.data,
      previousData: record,
    }).catch(() => {
      notify("chelone.notification.http_error", { type: "error" });
    });
  };

  const onDragEnd = ({ canceled, operation }: DragEndEvent) => {
    const { source, target } = operation;
    if (canceled || !source || !target) return;
    const record = data?.find((r) => String(r.id) === String(source.id));
    if (record) move(record, String(target.id));
  };

  // A resource that registers neither view has no route to link to.
  const type =
    linkType ??
    (hasEdit !== false ? "edit" : hasShow !== false ? "show" : false);
  const select = (record: TRecord) => {
    if (onSelectCard) return onSelectCard(record);
    if (resource && type)
      navigate(createPath({ resource, id: record.id, type }));
  };
  const selectable = !!onSelectCard || (!!resource && type !== false);

  const textOf = (record: TRecord, source?: SourceProp<TRecord>) =>
    source ? getAtPath(record, source) : undefined;
  // The Move button's name is plain text: a representation may be an element.
  const titleTextOf = (record: TRecord): string => {
    const value = textOf(record, titleSource);
    return value == null ? getRepresentationText(record) : String(value);
  };
  const titleOf = (record: TRecord): ReactNode => {
    const value = textOf(record, titleSource);
    return value == null ? getRepresentation(record) : String(value);
  };

  return (
    <DragDropProvider sensors={SENSORS} plugins={PLUGINS} onDragEnd={onDragEnd}>
      <div
        data-slot="kanban-board"
        className={cn("flex items-start gap-4 overflow-x-auto pb-2", className)}
      >
        {buckets.map(({ column, records }) => (
          // biome-ignore lint/a11y/useSemanticElements: a fieldset would style as a form group; the column is a named region of cards
          <div
            key={column.id}
            role="group"
            aria-label={column.label}
            data-slot="kanban-column"
            data-column-id={column.id}
            className={cn(
              "flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/50 p-2",
              column.className,
            )}
          >
            <div className="flex items-center justify-between px-1 text-sm font-medium">
              <span>{column.label}</span>
              <span
                data-slot="kanban-column-count"
                className="text-muted-foreground"
              >
                {records.length}
              </span>
            </div>
            <KanbanColumnCards columnId={column.id}>
              {records.length === 0 ? (
                <p
                  data-slot="kanban-empty"
                  className="px-1 py-2 text-sm text-muted-foreground"
                >
                  {translate("chelone.kanban_board.empty", { _: "No items" })}
                </p>
              ) : (
                records.map((record) => {
                  const title = titleOf(record);
                  const description = textOf(record, descriptionSource);
                  return (
                    <KanbanCardShell
                      key={record.id}
                      recordId={record.id}
                      draggable={draggable}
                      role="button"
                      tabIndex={0}
                      className="flex cursor-pointer items-start gap-2 rounded-md border bg-card p-3 text-sm shadow-xs data-[dragging]:opacity-50"
                      onClick={selectable ? () => select(record) : undefined}
                      onKeyDown={
                        selectable
                          ? (e: KeyboardEvent<HTMLElement>) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              select(record);
                            }
                          : undefined
                      }
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        {cardRenderer ? (
                          cardRenderer(record)
                        ) : (
                          <>
                            <span
                              data-slot="kanban-card-title"
                              className="font-medium"
                            >
                              {title}
                            </span>
                            {isEmpty(description) ? null : (
                              <span
                                data-slot="kanban-card-description"
                                className="text-muted-foreground"
                              >
                                {String(description)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {draggable ? (
                        // Menu items are portalled, but React events still bubble to the card.
                        // biome-ignore lint/a11y/noStaticElementInteractions: only stops the menu's events reaching the card
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                data-slot="kanban-card-move"
                                className="size-6"
                                aria-label={translate(
                                  "chelone.kanban_board.move",
                                  {
                                    title: titleTextOf(record),
                                    _: "Move {title}",
                                  },
                                )}
                              >
                                <ArrowRightLeftIcon aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {columns
                                .filter((other) => other.id !== column.id)
                                .map((other) => (
                                  <DropdownMenuItem
                                    key={other.id}
                                    onSelect={() => move(record, other.id)}
                                  >
                                    {other.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : null}
                    </KanbanCardShell>
                  );
                })
              )}
            </KanbanColumnCards>
          </div>
        ))}
      </div>
    </DragDropProvider>
  );
}

export { KanbanBoard };
