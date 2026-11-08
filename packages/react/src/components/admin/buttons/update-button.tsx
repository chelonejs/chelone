/**
 * `<UpdateButton>` — patches the ambient record with a fixed `data` payload.
 * Ported from shadmin `buttons/update-button.tsx` and rebuilt on `useUpdate`
 * (chelone has no `useUpdateController`), the way `<DeleteButton>` is rebuilt
 * on its own pieces:
 *
 * - `mutationMode="undoable"` (default) patches the cache now, shows the Undo
 *   notification and defers the server call; no dialog opens.
 * - `"pessimistic"` and `"optimistic"` open `<Confirm>` first. `useUpdate`
 *   notifies only in undoable mode, so the button notifies `updated` /
 *   `http_error` itself for the confirmed call.
 * - shadmin's separate `UpdateWithConfirmButton` / `UpdateWithUndoButton` stay
 *   internal to this one component; ra-core's `redirect`, `successMessage` and
 *   `mutationOptions` are not carried over.
 * - `useCanAccess` → the no-throw `useMenuAccess`.
 */

import type {
  LooseRecord,
  MutationMode,
  RecordResources,
  ResourceRecord,
} from "@chelone/core";
import { RefreshCw } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUpdate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceTranslation } from "../../../label";
import { humanize, pluralize } from "../../../label/inflection";
import { useNotify } from "../../../notification-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { Confirm, type ConfirmProps } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

interface UpdateButtonProps<TRecord extends ResourceRecord = LooseRecord> {
  /** The fields to patch onto the record. */
  data: Partial<NoInfer<TRecord>>;
  /**
   * `"undoable"` (default) patches the record now with an Undo notification and
   * no dialog; the server call is deferred until the Undo window closes.
   * `"pessimistic"` and `"optimistic"` ask for confirmation first, and
   * `"optimistic"` closes the dialog on confirm.
   */
  mutationMode?: MutationMode;
  label?: string;
  icon?: ReactNode;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  record?: TRecord;
  resource?: string;
  /** Receives the updated record. Runs only for a confirmed update, not for an undoable one. */
  onSuccess?: (data: TRecord) => void;
  /** Receives the error of a failed confirmed update. */
  onError?: (error: unknown) => void;
  confirmTitle?: ReactNode;
  confirmContent?: ReactNode;
  confirmColor?: "primary" | "warning";
  titleTranslateOptions?: ConfirmProps["titleTranslateOptions"];
  contentTranslateOptions?: ConfirmProps["contentTranslateOptions"];
  ref?: Ref<HTMLButtonElement>;
}

const defaultIcon = <RefreshCw />;

/**
 * A button that updates the current record with a fixed data payload.
 *
 * Reads the record + resource from context.
 *
 * @example
 * import { Edit, UpdateButton, TextInput } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit actions={<UpdateButton label="Reset views" data={{ views: 0 }} />}>
 *     <TextInput source="title" />
 *   </Edit>
 * );
 */
function UpdateButton<TRecord extends ResourceRecord = LooseRecord>(
  props: UpdateButtonProps<TRecord>,
) {
  const {
    data,
    mutationMode = "undoable",
    label: labelProp,
    icon = defaultIcon,
    variant = "outline",
    className,
    onClick,
    onSuccess,
    onError,
    confirmTitle = "chelone.message.bulk_update_title",
    confirmContent = "chelone.message.bulk_update_content",
    confirmColor = "primary",
    titleTranslateOptions,
    contentTranslateOptions,
    ref,
  } = props;
  const record = useRecordContext<TRecord>(props);
  const resource = useResourceContext(props);
  const [isOpen, setOpen] = useState(false);
  const translate = useTranslate();
  const notify = useNotify();
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
    record,
  });
  // `useUpdate` binds the resource at hook-call time; a missing one renders
  // nothing below, so the call is never dispatched.
  const { mutateAsync, isPending } = useUpdate<
    RecordResources<TRecord>,
    string
  >(resource ?? "", { mutationMode });

  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.update`
      : undefined,
    baseI18nKey: "chelone.action.update",
    options: { _: labelProp ?? "Update" },
    userText: labelProp,
  });

  const nameOptions = {
    smart_count: 1,
    name: translate(`resources.${resource}.forcedCaseName`, {
      smart_count: 1,
      _: humanize(
        translate(`resources.${resource}.name`, {
          smart_count: 1,
          _: resource ? pluralize(resource, 1) : "",
        }),
      ),
    }),
  };

  const params = (current: TRecord) => ({
    id: current.id,
    data,
    previousData: current,
  });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!record) return;
    if (mutationMode !== "undoable") {
      setOpen(true);
      return;
    }
    // Undoable `mutateAsync` resolves once the Undo notification is enqueued.
    void mutateAsync(params(record));
    onClick?.(e);
  };

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!record) return;
    const update = mutateAsync(params(record));
    if (mutationMode === "optimistic") setOpen(false);
    onClick?.(e);
    try {
      const result = await update;
      notify("chelone.notification.updated", {
        type: "info",
        messageArgs: { smart_count: 1 },
      });
      if (result) onSuccess?.(result);
    } catch (error) {
      notify("chelone.notification.http_error", { type: "error" });
      onError?.(error);
    } finally {
      setOpen(false);
    }
  };

  if (!resource || !record || record.id == null) return null;
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
        titleTranslateOptions={{ ...nameOptions, ...titleTranslateOptions }}
        contentTranslateOptions={{
          ...nameOptions,
          ...contentTranslateOptions,
        }}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </Fragment>
  );
}

export { UpdateButton, type UpdateButtonProps };
