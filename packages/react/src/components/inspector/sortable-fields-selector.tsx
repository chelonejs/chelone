/**
 * `<SortableFieldsSelector>` — `<FieldsSelector>` with a grip on each row to
 * drag it into place. Move up and Move down stay as the keyboard path, and the
 * grip is off while the list is searched, when the order on screen is not the
 * real one. The drag runs on the optional `@dnd-kit/react` peer, which is why
 * this is not part of `<ColumnsButton>`.
 */

import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import {
  FieldsSelector,
  type FieldsSelectorListProps,
  type FieldsSelectorProps,
  type FieldsSelectorRowProps,
} from "../admin/buttons/fields-selector";

type SortableFieldsSelectorProps = Omit<
  FieldsSelectorProps,
  "listAs" | "rowAs"
>;

function SortableList({ onMove, children }: FieldsSelectorListProps) {
  return (
    <DragDropProvider
      onDragEnd={({ canceled, operation }) => {
        const { source } = operation;
        if (canceled || !isSortable(source)) return;
        if (source.index !== source.initialIndex) {
          onMove(String(source.id), source.index);
        }
      }}
    >
      <ul className="flex flex-col gap-1">{children}</ul>
    </DragDropProvider>
  );
}

function SortableRow({ id, index, disabled, children }: FieldsSelectorRowProps) {
  const translate = useTranslate();
  const { ref, handleRef, isDragging } = useSortable({ id, index, disabled });

  return (
    <li
      ref={ref}
      data-dragging={isDragging ? "" : undefined}
      className={cn(
        "flex items-center gap-2 bg-popover",
        isDragging && "opacity-80 shadow-md",
      )}
    >
      <Button
        ref={handleRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="fields-selector-drag-handle"
        aria-label={translate("chelone.inspector.drag_field", {
          _: "Drag to reorder",
        })}
        disabled={disabled}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical />
      </Button>
      {children}
    </li>
  );
}

/**
 * The columns a `<DataTable>` published under `storeKey`, each with a switch,
 * a grip and move buttons.
 *
 * @example
 * import { SortableFieldsSelector } from "@chelone/react/inspector";
 *
 * const Panel = () => <SortableFieldsSelector storeKey="posts.datatable" />;
 */
function SortableFieldsSelector(props: SortableFieldsSelectorProps) {
  return (
    <FieldsSelector {...props} listAs={SortableList} rowAs={SortableRow} />
  );
}

export { SortableFieldsSelector, type SortableFieldsSelectorProps };
