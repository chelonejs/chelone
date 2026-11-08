/**
 * `<DeleteButton>` — deletes the ambient record behind a confirmation dialog.
 * Ported from shadmin `buttons/delete-button.tsx` and heavily rebridged, because
 * chelone's delete stack diverges from ra-core's:
 *
 * - `mutationMode="pessimistic"` (default) is confirm-gated via the `<Confirm>`
 *   dialog; `mutationMode="undoable"` deletes optimistically with an Undo
 *   notification (via the vanilla `startUndoableMutation` engine) and no confirm.
 * - `useDeleteController(resource)` gives `{ deleteOne, saving }` (NOT ra's
 *   `{ handleDelete, isPending }` with baked-in record/redirect/label). This
 *   button wires the pieces itself: `deleteOne(id, { previousData })` on confirm,
 *   the post-delete list redirect via the controller's `onRedirect` (fed
 *   `useRedirect`), and the label/confirm copy via `useResourceTranslation`.
 * - `useCanAccess` (which throws with no authProvider) → the no-throw
 *   `useMenuAccess`.
 *
 * The controller's default success already notifies `deleted` + requests the
 * list redirect + strips the deleted id from the KV selection.
 */

import {
  definedParams,
  isLooseRecord,
  type LooseRecord,
  type MutationMode,
  type ResourceRecord,
  removeRecordsFromCache,
} from "@chelone/core";
import { useQueryClient } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDataProvider } from "../../../compat-hooks";
import { useDeleteController } from "../../../controller-hooks";
import { useTranslate } from "../../../i18n-hooks";
import {
  useGetRecordRepresentation,
  useResourceTranslation,
} from "../../../label";
import { humanize, pluralize } from "../../../label/inflection";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { useRedirect } from "../../../router";
import { useUndoable } from "../../../undoable-hooks";
import { Confirm } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

interface DeleteButtonProps<TRecord extends ResourceRecord = LooseRecord> {
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  record?: TRecord;
  onClick?: React.ReactEventHandler<HTMLButtonElement>;
  /**
   * `"undoable"` deletes optimistically with an Undo notification (no confirm
   * dialog): the record vanishes now, the list redirect happens immediately,
   * and the server call is deferred until the Undo window closes. Default
   * (`"pessimistic"`) is confirm-gated.
   */
  mutationMode?: MutationMode;
  redirect?: "list" | "show" | "edit" | false;
  resource?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
  confirmTitle?: ReactNode;
  confirmContent?: ReactNode;
  confirmColor?: "primary" | "warning";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

const defaultDestructiveClassName =
  "cursor-pointer hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40";

/**
 * A button that deletes a record after asking for confirmation.
 *
 * Reads the record + resource from context. On confirm it deletes the record,
 * notifies, and redirects to the list (by default).
 *
 * @example
 * import { Edit, DeleteButton } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit actions={<DeleteButton />}>
 *     ...
 *   </Edit>
 * );
 */
function DeleteButton<TRecord extends ResourceRecord = LooseRecord>(
  props: DeleteButtonProps<TRecord>,
) {
  const {
    label: labelProp,
    onClick,
    ref,
    size,
    redirect: redirectTo = "list",
    variant = "outline",
    className = defaultDestructiveClassName,
    confirmTitle: confirmTitleProp,
    confirmContent: confirmContentProp,
    confirmColor = "warning",
    mutationMode = "pessimistic",
  } = props;
  const record = useRecordContext<TRecord>(props);
  const resource = useResourceContext(props);
  if (!resource) {
    throw new Error(
      "<DeleteButton> components should be used inside a <Resource> component or provided with a resource prop.",
    );
  }
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "delete",
    resource,
    record,
  });
  const translate = useTranslate();
  const redirect = useRedirect();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const dataProvider = useDataProvider();
  const runUndoable = useUndoable();

  const { saving, deleteOne } = useDeleteController(resource, {
    onRedirect: redirect,
  });

  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const recordRepresentationValue = getRecordRepresentation(record);
  const recordRepresentation =
    typeof recordRepresentationValue === "string"
      ? recordRepresentationValue
      : record?.id != null
        ? `#${record.id}`
        : undefined;
  const resourceName = translate(`resources.${resource}.forcedCaseName`, {
    smart_count: 1,
    _: humanize(
      translate(`resources.${resource}.name`, {
        smart_count: 1,
        _: pluralize(resource, 1),
      }),
    ),
  });

  const label = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.action.delete`,
    baseI18nKey: "chelone.action.delete",
    options: definedParams({
      _: "Delete",
      name: resourceName,
      recordRepresentation,
    }),
    userText: labelProp,
  });
  const confirmTitle = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.message.delete_title`,
    baseI18nKey: "chelone.message.delete_title",
    options: definedParams({
      _: "Delete {name} {recordRepresentation}",
      recordRepresentation,
      name: resourceName,
      id: record?.id,
    }),
    userText: confirmTitleProp,
  });
  const confirmContent = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.message.delete_content`,
    baseI18nKey: "chelone.message.delete_content",
    options: definedParams({
      _: "Are you sure you want to delete this item?",
      recordRepresentation,
      name: resourceName,
      id: record?.id,
    }),
    userText: confirmContentProp,
  });

  const handleButtonClick: React.ReactEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation();
    if (mutationMode === "undoable") {
      if (onClick) onClick(event);
      if (!record || !isLooseRecord(record) || record.id == null) return;
      const id = record.id;
      const previousData = record;
      runUndoable({
        queryKeys: [[resource]],
        applyOptimistic: () =>
          removeRecordsFromCache(queryClient, resource, [id]),
        commit: () => dataProvider.delete(resource, { id, previousData }),
        message: "chelone.notification.deleted",
        messageArgs: { smart_count: 1 },
      });
      // Redirect optimistically (the row is already gone from the cache).
      if (redirectTo !== false) {
        redirect(redirectTo, resource, id);
      }
      return;
    }
    setOpen(true);
    if (onClick) {
      onClick(event);
    }
  };
  const handleDialogClose = () => {
    setOpen(false);
  };
  const handleDelete = async () => {
    if (!record || !isLooseRecord(record) || record.id == null) return;
    await deleteOne(record.id, { previousData: record });
    setOpen(false);
    // The controller's default success already requests the list redirect;
    // honor an explicit non-list `redirect` prop here.
    if (redirectTo !== "list" && redirectTo !== false) {
      redirect(redirectTo, resource, record.id);
    }
  };

  if (isAccessPending || !canAccess) return null;
  return (
    <Fragment>
      <Button
        ref={ref}
        variant={variant}
        type="button"
        onClick={handleButtonClick}
        disabled={saving}
        aria-label={typeof label === "string" ? label : undefined}
        size={size}
        className={className}
      >
        <Trash />
        {label}
      </Button>
      <Confirm
        isOpen={open}
        loading={saving}
        title={confirmTitle}
        content={confirmContent}
        confirmColor={confirmColor}
        onConfirm={handleDelete}
        onClose={handleDialogClose}
      />
    </Fragment>
  );
}

export { DeleteButton, type DeleteButtonProps };
