/**
 * `<BulkUpdateButton>` — patches the selected rows with a fixed `data` payload,
 * behind a confirmation dialog. Ported from shadmin `buttons/bulk-update-button.tsx`
 * and rebridged like {@link BulkDeleteButton}: chelone has NO
 * `useBulkUpdateController` and NO undoable mode, so the DEFAULT — and only —
 * path is pessimistic-with-confirm. `mutationMode` is accepted for API parity
 * but ignored. The update fires against the raw `dataProvider.updateMany(
 * resource, { ids, data })`; on success it invalidates queries (`useRefresh`),
 * clears the selection (`unselectAll`), and notifies
 * `chelone.notification.updated`. `useCanAccess` → the no-throw `useMenuAccess`.
 */

import type { Identifier, LooseRecord } from "@chelone/core";
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
import { Confirm } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

const defaultIcon = <RefreshCw />;
const defaultData: Partial<LooseRecord> = {};

interface BulkUpdateButtonProps {
  className?: string;
  confirmContent?: ReactNode;
  confirmTitle?: ReactNode;
  confirmColor?: "primary" | "warning";
  data?: Partial<LooseRecord>;
  icon?: React.ReactNode;
  label?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  resource?: string;
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
function BulkUpdateButton(props: BulkUpdateButtonProps) {
  const {
    className,
    confirmTitle = "ra.message.bulk_update_title",
    confirmContent = "ra.message.bulk_update_content",
    confirmColor = "primary",
    data = defaultData,
    icon = defaultIcon,
    label: labelProp,
    onClick,
    ref,
    variant = "outline",
  } = props;
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

  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.update`
      : undefined,
    baseI18nKey: "ra.action.update",
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
      await dataProvider.updateMany(resource, {
        ids: selectedIds as Identifier[],
        data,
      });
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
