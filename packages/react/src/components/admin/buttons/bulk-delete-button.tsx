/**
 * `<BulkDeleteButton>` — deletes the selected rows behind a confirmation dialog.
 * Ported from shadmin `buttons/bulk-delete-button.tsx` and heavily rebridged,
 * because chelone diverges from ra-core's bulk stack:
 *
 * - There is NO `useBulkDeleteController` and NO undoable mode in chelone (no
 *   undo-notification stack yet), so the DEFAULT — and only — path is
 *   pessimistic-with-confirm: the `<Confirm>` gate. `mutationMode` is accepted
 *   for API parity but ignored (always confirm-gated).
 * - The delete fires against the raw `dataProvider.deleteMany(resource, { ids })`
 *   (there is no bulk mutation hook). On success it invalidates queries
 *   (`useRefresh`) so the list refetches, clears the selection (`unselectAll`),
 *   and notifies `chelone.notification.deleted`.
 * - `useCanAccess` (which throws with no authProvider) → the no-throw
 *   `useMenuAccess`.
 */

import type { Identifier } from "@chelone/core";
import { Trash } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDataProvider, useRefresh } from "../../../compat-hooks";
import { useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { useGetResourceLabel, useResourceTranslation } from "../../../label";
import { humanize, pluralize } from "../../../label/inflection";
import { useNotify } from "../../../notification-hooks";
import { useResourceContext } from "../../../resource";
import { Confirm } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

interface BulkDeleteButtonProps {
  label?: string;
  icon?: ReactNode;
  className?: string;
  confirmTitle?: ReactNode;
  confirmContent?: ReactNode;
  confirmColor?: "primary" | "warning";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  resource?: string;
  ref?: Ref<HTMLButtonElement>;
}

const defaultIcon = <Trash />;

/**
 * A button that deletes multiple selected records at once, after asking for
 * confirmation. Use inside a `<DataTable bulkActionsButtons>` /
 * `<BulkActionsToolbar>`.
 *
 * @example
 * import { BulkDeleteButton, DataTable, List } from "@chelone/react";
 *
 * export const PostList = () => (
 *   <List>
 *     <DataTable bulkActionButtons={<BulkDeleteButton />}>
 *       ...
 *     </DataTable>
 *   </List>
 * );
 */
function BulkDeleteButton(props: BulkDeleteButtonProps) {
  const {
    icon = defaultIcon,
    label: labelProp,
    className,
    onClick,
    ref,
    confirmTitle = "ra.message.bulk_delete_title",
    confirmContent = "ra.message.bulk_delete_content",
    confirmColor = "primary",
  } = props;
  const [isOpen, setOpen] = useState(false);
  const [isPending, setPending] = useState(false);
  const { selectedIds, unselectAll } = useListContext();
  const resource = useResourceContext(props);
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "delete",
    resource: resource ?? "",
  });
  const translate = useTranslate();
  const getResourceLabel = useGetResourceLabel();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  const notify = useNotify();

  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.delete`
      : undefined,
    baseI18nKey: "ra.action.delete",
    options: {
      _: "Delete",
      name: resource ? getResourceLabel(resource, 1) : undefined,
    },
    userText: labelProp,
  });

  const nameOptions = {
    smart_count: selectedIds.length,
    name: translate(`resources.${resource}.forcedCaseName`, {
      smart_count: selectedIds.length,
      _: humanize(
        translate(`resources.${resource}.name`, {
          smart_count: selectedIds.length,
          _: resource ? pluralize(resource, selectedIds.length) : "",
        }),
      ),
    }),
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleDialogClose = () => {
    setOpen(false);
  };

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!resource) return;
    setPending(true);
    try {
      await dataProvider.deleteMany(resource, {
        ids: selectedIds as Identifier[],
      });
      notify("chelone.notification.deleted", {
        type: "info",
        messageArgs: { smart_count: selectedIds.length },
      });
      unselectAll();
      refresh();
    } catch (error) {
      console.error(error);
      notify("chelone.notification.http_error", { type: "error" });
    } finally {
      setPending(false);
      setOpen(false);
    }
    onClick?.(e);
  };

  if (isAccessPending || !canAccess) return null;
  return (
    <Fragment>
      <Button
        ref={ref}
        variant="destructive"
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={typeof label === "string" ? label : undefined}
        className={cn("h-9", className)}
      >
        {icon}
        {label}
      </Button>
      <Confirm
        isOpen={isOpen}
        loading={isPending}
        title={confirmTitle}
        content={confirmContent}
        confirmColor={confirmColor}
        titleTranslateOptions={nameOptions}
        contentTranslateOptions={nameOptions}
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
      />
    </Fragment>
  );
}

export { BulkDeleteButton, type BulkDeleteButtonProps };
