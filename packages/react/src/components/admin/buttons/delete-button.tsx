/**
 * `<DeleteButton>` — deletes the ambient record behind a confirmation dialog.
 * Ported from shadmin `buttons/delete-button.tsx` and heavily rebridged, because
 * chelone's delete stack diverges from ra-core's:
 *
 * - No undoable / `useDeleteWithUndoController` in chelone (there is no undo
 *   notification stack yet), so the DEFAULT is pessimistic-with-confirm — the
 *   `<Confirm>` dialog gate. `mutationMode` is accepted for API parity but only
 *   the confirm path exists.
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

import type { LooseRecord, MutationMode } from "@chelone/core";
import { Trash } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Confirm } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

interface DeleteButtonProps {
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  record?: LooseRecord;
  onClick?: React.ReactEventHandler<HTMLButtonElement>;
  /** Accepted for API parity; chelone only supports the confirm (pessimistic) path. */
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
function DeleteButton(props: DeleteButtonProps) {
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
    confirmColor = "primary",
  } = props;
  const record = useRecordContext(props);
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
    baseI18nKey: "ra.action.delete",
    options: {
      _: "Delete",
      name: resourceName,
      recordRepresentation,
    },
    userText: labelProp,
  });
  const confirmTitle = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.message.delete_title`,
    baseI18nKey: "ra.message.delete_title",
    options: {
      _: "Delete %{name} %{recordRepresentation}",
      recordRepresentation,
      name: resourceName,
      id: record?.id,
    },
    userText: confirmTitleProp,
  });
  const confirmContent = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.message.delete_content`,
    baseI18nKey: "ra.message.delete_content",
    options: {
      _: "Are you sure you want to delete this item?",
      recordRepresentation,
      name: resourceName,
      id: record?.id,
    },
    userText: confirmContentProp,
  });

  const handleDialogOpen: React.ReactEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation();
    setOpen(true);
    if (onClick) {
      onClick(event);
    }
  };
  const handleDialogClose = () => {
    setOpen(false);
  };
  const handleDelete = async () => {
    if (record?.id == null) return;
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
        onClick={handleDialogOpen}
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
