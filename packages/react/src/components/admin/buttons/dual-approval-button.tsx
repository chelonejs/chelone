/**
 * `<DualApprovalButton>` — records the signed-in user's approval on the ambient
 * record. Ported from shadmin `buttons/dual-approval-button.tsx` and rebuilt on
 * `useUpdate` the way `<UpdateButton>` is, with the decisions in core's
 * `getApprovalState` / `buildApprovalUpdate`.
 *
 * - Defaults to `mutationMode="pessimistic"`, so the screen never shows an
 *   approval the server refused. `"undoable"` gives the Undo notification.
 * - `useUpdate` notifies only in undoable mode, so the button notifies
 *   `updated` / `http_error` itself for the other modes.
 * - shadmin's `data-dual-approve` attribute is a `data-slot` here.
 * - This is a UI rule, not a security one: the server has to enforce the count
 *   and who may approve.
 */

import {
  buildApprovalUpdate,
  getApprovalState,
  isLooseRecord,
  type MutationMode,
  type RegisteredAnyRecord,
  type ResourceRecord,
} from "@chelone/core";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOptionalIdentity } from "../../../auth-hooks";
import { useUpdate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { useMenuAccess } from "../layout/use-menu-access";

interface DualApprovalButtonProps<
  TRecord extends ResourceRecord = RegisteredAnyRecord,
> {
  /** Approvals needed. Default 2. */
  required?: number;
  /** Record field holding the approver ids, a top-level key. Default `"approvers"`. */
  approverSource?: keyof TRecord & string;
  /** Record field the status is written to, a top-level key. Default `"status"`. */
  statusSource?: keyof TRecord & string;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: string;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: string;
  resource?: string;
  record?: TRecord;
  /** Default `"pessimistic"`; `"undoable"` shows an Undo notification. */
  mutationMode?: MutationMode;
  className?: string;
}

/**
 * A button that adds the signed-in user to the record's approver list and moves
 * its status once enough users have approved. Reads the record and resource
 * from context; renders nothing without a record, a resource or `edit` access.
 *
 * @example
 * import { DualApprovalButton, Edit, TextInput } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit actions={<DualApprovalButton required={2} />}>
 *     <TextInput source="title" />
 *   </Edit>
 * );
 */
function DualApprovalButton<
  TRecord extends ResourceRecord = RegisteredAnyRecord,
>(props: DualApprovalButtonProps<TRecord>) {
  const {
    required,
    approverSource,
    statusSource,
    pendingValue,
    approvedValue,
    mutationMode = "pessimistic",
    className,
  } = props;
  const record = useRecordContext<TRecord>(props);
  const resource = useResourceContext(props);
  const translate = useTranslate();
  const notify = useNotify();
  const { identity } = useOptionalIdentity();
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
    record,
  });
  const { mutateAsync, isPending } = useUpdate(resource ?? "", {
    mutationMode,
  });

  if (!resource || !record || record.id == null || !isLooseRecord(record)) {
    return null;
  }
  if (isAccessPending || !canAccess) return null;

  const options = {
    required,
    approverSource,
    statusSource,
    pendingValue,
    approvedValue,
    identityId: identity?.id,
  };
  const state = getApprovalState(record, options);

  if (state.isComplete) {
    return (
      <span
        data-slot="dual-approval-complete"
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground",
          className,
        )}
      >
        <Check className="size-4" aria-hidden="true" />
        {translate("chelone.approval.complete", {
          _: "Fully approved ({count} of {required})",
          count: state.count,
          required: state.required,
        })}
      </span>
    );
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const data = buildApprovalUpdate(record, options);
    if (!data) return;
    const update = mutateAsync({
      id: record.id,
      data,
      previousData: record,
    });
    // An undoable `mutateAsync` resolves once the Undo notification is enqueued.
    if (mutationMode === "undoable") {
      void update.catch(() => {});
      return;
    }
    try {
      await update;
      notify("chelone.notification.updated", {
        type: "info",
        messageArgs: { smart_count: 1 },
      });
    } catch {
      notify("chelone.notification.http_error", { type: "error" });
    }
  };

  const alreadyApproved = translate("chelone.approval.already_approved", {
    _: "You already approved",
  });

  return (
    <Button
      type="button"
      variant="outline"
      data-slot="dual-approval-button"
      className={className}
      disabled={!state.canApprove || isPending}
      title={state.hasApproved ? alreadyApproved : undefined}
      onClick={handleClick}
    >
      <Check aria-hidden="true" />
      {state.hasApproved
        ? alreadyApproved
        : translate("chelone.approval.approve", { _: "Approve" })}
      <span className="text-muted-foreground">
        {translate("chelone.approval.count", {
          _: "{count} of {required}",
          count: state.count,
          required: state.required,
        })}
      </span>
    </Button>
  );
}

export { DualApprovalButton, type DualApprovalButtonProps };
