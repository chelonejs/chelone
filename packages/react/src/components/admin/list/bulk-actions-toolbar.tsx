import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

/**
 * A sticky toolbar that appears when rows are selected in a `<DataTable>`.
 *
 * Shows the number of selected rows, an unselect-all control, and any bulk
 * action `children`. Hidden when nothing is selected. Ported from shadmin,
 * rewired off chelone's `useListContext` selection (`selectedIds` +
 * `unselectAll`). Chelone divergence: shadmin's default children
 * (`SelectAllButton` / `BulkExportButton` / `BulkDeleteButton`) live in a later
 * button wave, so this toolbar has NO default children — pass your own, or let
 * `<DataTable bulkActionButtons>` supply them.
 *
 * @example
 * <DataTable bulkActionsToolbar={
 *   <BulkActionsToolbar>
 *     <BulkDeleteButton />
 *   </BulkActionsToolbar>
 * }>
 *   …
 * </DataTable>
 */
interface BulkActionsToolbarProps {
  children?: ReactNode;
  label?: ReactNode;
}

function BulkActionsToolbar({ children, label }: BulkActionsToolbarProps) {
  const { selectedIds, unselectAll } = useListContext();
  const translate = useTranslate();
  if (!selectedIds?.length) {
    return null;
  }
  const handleUnselectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    unselectAll();
  };
  // chelone i18n returns the KEY when a message is not registered — fall back to
  // a local English string in that case (the ported UI must read regardless).
  const unselectLabelRaw = translate("chelone.action.unselect", {});
  const unselectLabel =
    unselectLabelRaw === "chelone.action.unselect"
      ? "Unselect"
      : unselectLabelRaw;
  const countRaw = translate("chelone.action.bulk_actions", {
    smart_count: selectedIds.length,
  });
  const countLabel =
    countRaw === "chelone.action.bulk_actions"
      ? `${selectedIds.length} rows selected`
      : countRaw;
  return (
    <Card className="flex flex-col gap-2 md:gap-6 md:flex-row items-stretch sm:items-center p-2 px-4 w-[90%] sm:w-fit mx-auto fixed bottom-2 left-0 right-0 z-10 bg-muted">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="has-[>svg]:px-0"
          onClick={handleUnselectAll}
          aria-label={unselectLabel}
        >
          <X />
        </Button>
        <span className="text-sm text-muted-foreground">
          {label != null ? label : countLabel}
        </span>
      </div>
      {children}
    </Card>
  );
}

export { BulkActionsToolbar, type BulkActionsToolbarProps };
