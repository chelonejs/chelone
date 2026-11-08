/**
 * `<BulkUpdateButton>` — patches the selected rows with a fixed `data` payload.
 * Ported from shadmin `buttons/bulk-update-button.tsx` and rebridged like
 * {@link BulkDeleteButton}: `mutationMode="pessimistic"` (default) is
 * confirm-gated; `mutationMode="undoable"` patches the cache optimistically
 * with an Undo notification and no confirm. The update fires against the raw
 * `dataProvider.updateMany(resource, { ids, data })`; the pessimistic path
 * invalidates queries (`useRefresh`), clears the selection (`unselectAll`), and
 * notifies `chelone.notification.updated`, while the undoable path defers the
 * server call until commit. `useCanAccess` → the no-throw `useMenuAccess`.
 */

import {
  type LooseRecord,
  type MutationMode,
  type ResourceRecord,
  updateRecordsInCache,
} from "@chelone/core";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDataProvider, useRefresh } from "../../../compat-hooks";
import { useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceTranslation } from "../../../label";
import { humanize, pluralize } from "../../../label/inflection";
import { useNotify } from "../../../notification-hooks";
import { useResourceContext } from "../../../resource";
import { useUndoable } from "../../../undoable-hooks";
import { Confirm } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

const defaultIcon = <RefreshCw />;

interface BulkUpdateButtonProps<TRecord extends ResourceRecord = LooseRecord> {
  className?: string;
  confirmContent?: ReactNode;
  confirmTitle?: ReactNode;
  confirmColor?: "primary" | "warning";
  data?: Partial<NoInfer<TRecord>>;
  icon?: React.ReactNode;
  label?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  resource?: string;
  /**
   * `"undoable"` updates optimistically with an Undo notification (no confirm
   * dialog): the rows patch now and the server call is deferred until the Undo
   * window closes. Default (`"pessimistic"`) is confirm-gated.
   */
  mutationMode?: MutationMode;
  ref?: Ref<HTMLButtonElement>;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

/**
 * Updates the selected records with a fixed data payload, after asking for
 * confirmation. Must be used inside a `ListContext` (e.g. inside a
 * `<DataTable bulkActionsButtons>`).
 *
 * @example
 * import { BulkUpdateButton, DataTable, List } from "@chelone/react";
 *
 * const ResetViewsButton = () => (
 *   <BulkUpdateButton label="Reset Views" data={{ views: 0 }} />
 * );
 */
function BulkUpdateButton<TRecord extends ResourceRecord = LooseRecord>(
  props: BulkUpdateButtonProps<TRecord>,
) {
  const {
    className,
    confirmTitle = "chelone.message.bulk_update_title",
    confirmContent = "chelone.message.bulk_update_content",
    confirmColor = "primary",
    icon = defaultIcon,
    label: labelProp,
    onClick,
    ref,
    variant = "outline",
    mutationMode = "pessimistic",
  } = props;
  const data: Partial<NoInfer<TRecord>> = props.data ?? {};
  const [isOpen, setOpen] = useState(false);
  const [isPending, setPending] = useState(false);
  const { selectedIds, unselectAll } = useListContext();
  const resource = useResourceContext(props);
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
  });
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const runUndoable = useUndoable();

  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.update`
      : undefined,
    baseI18nKey: "chelone.action.update",
    options: { _: "Update" },
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
    if (mutationMode === "undoable") {
      if (!resource) return;
      runUndoable({
        queryKeys: [[resource]],
        applyOptimistic: () =>
          updateRecordsInCache(queryClient, resource, selectedIds, data),
        commit: () =>
          dataProvider.updateMany(resource, { ids: selectedIds, data }),
        message: "chelone.notification.updated",
        messageArgs: { smart_count: selectedIds.length },
        onCommitError: () => {
          notify("chelone.notification.http_error", { type: "error" });
          refresh();
        },
      });
      unselectAll();
      onClick?.(e);
      return;
    }
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
      await dataProvider.updateMany(resource, { ids: selectedIds, data });
      notify("chelone.notification.updated", {
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
    if (typeof onClick === "function") {
      onClick(e);
    }
  };

  if (isAccessPending || !canAccess) return null;
  return (
    <Fragment>
      <Button
        ref={ref}
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={isPending}
        aria-label={typeof label === "string" ? label : undefined}
        className={className}
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

export { BulkUpdateButton, type BulkUpdateButtonProps };
