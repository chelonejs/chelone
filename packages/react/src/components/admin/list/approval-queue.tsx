import {
  buildRejectionUpdate,
  getAtPath,
  isLooseRecord,
  type LooseRecord,
  type MutationMode,
  type ResourceRecord,
  type SourceProp,
} from "@chelone/core";
import { useIsMutating } from "@tanstack/react-query";
import { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useOptionalIdentity } from "../../../auth-hooks";
import { useListContext } from "../../../form";
import { useUpdate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { useNotify } from "../../../notification-hooks";
import { RecordContextProvider } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { DualApprovalButton } from "../buttons/dual-approval-button";
import { useMenuAccess } from "../layout/use-menu-access";

export interface ApprovalQueueProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The field shown as the row title; the record representation when it is null or undefined. */
  titleSource?: SourceProp<TRecord>;
  /** The field shown as a second line when its value is not empty. */
  subtitleSource?: SourceProp<TRecord>;
  /** Renders extra content in each row; the row's record is the ambient record. */
  rowExtra?: (record: TRecord) => ReactNode;
  /** Approvals needed. Default 1. */
  required?: number;
  /** Record field holding the approver ids, a top-level key. Default `"approvers"`. */
  approverSource?: keyof TRecord & string;
  /** Record field the status is written to and read from. Default `"status"`. */
  statusSource?: keyof TRecord & string;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: string;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: string;
  /** Status written on rejection. Default `"rejected"`. */
  rejectedValue?: string;
  /** Record field the reason is written to. Default `"rejectionNote"`. */
  noteSource?: string;
  /** Record field the rejecter's id is written to. Default `"rejectedBy"`. */
  rejectedBySource?: string;
  /** Refuse a rejection until a reason is typed. Default `false`. */
  requireReason?: boolean;
  /** Default `"pessimistic"`; `"undoable"` shows an Undo notification. */
  mutationMode?: MutationMode;
  className?: string;
}

type RowProps<TRecord extends ResourceRecord> = Omit<
  ApprovalQueueProps<TRecord>,
  "className"
> & { record: TRecord };

// type-escape: getAtPath reads a record by a runtime path and returns unknown
const isEmpty = (value: unknown) => value == null || value === "";

function ApprovalQueueRow<TRecord extends ResourceRecord>({
  record,
  titleSource,
  subtitleSource,
  rowExtra,
  required = 1,
  approverSource,
  statusSource,
  pendingValue,
  approvedValue,
  rejectedValue,
  noteSource,
  rejectedBySource,
  requireReason,
  mutationMode = "pessimistic",
}: RowProps<TRecord>) {
  const resource = useResourceContext();
  const translate = useTranslate();
  const notify = useNotify();
  const reasonId = useId();
  const getRepresentation = useGetRecordRepresentation(resource);
  const { mutateAsync, isPending } = useUpdate(resource ?? "", {
    mutationMode,
  });
  // Approve has its own `useUpdate`, so the row counts the record's in-flight
  // updates from the mutation cache; two decisions never go out from one stale record.
  const updating =
    useIsMutating({
      mutationKey: [resource ?? "", "update"],
      predicate: ({ state: { variables } }) =>
        typeof variables === "object" &&
        variables !== null &&
        "id" in variables &&
        variables.id === record.id,
    }) > 0;
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
    record,
  });
  const { identity } = useOptionalIdentity();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const titleValue = titleSource ? getAtPath(record, titleSource) : undefined;
  const title =
    titleValue == null ? getRepresentation(record) : String(titleValue);
  const subtitle = subtitleSource
    ? getAtPath(record, subtitleSource)
    : undefined;

  const rejection = buildRejectionUpdate(record, {
    identityId: identity?.id,
    statusSource,
    rejectedValue,
    noteSource,
    rejectedBySource,
    requireReason,
    reason,
  });

  const isRejected =
    Reflect.get(record, statusSource ?? "status") ===
    (rejectedValue ?? "rejected");

  const close = () => {
    setOpen(false);
    setReason("");
  };

  const confirm = async () => {
    if (!rejection || !isLooseRecord(record)) return;
    const update = mutateAsync({
      id: record.id,
      data: rejection,
      previousData: record,
    });
    // An undoable `mutateAsync` resolves once the Undo notification is enqueued.
    if (mutationMode === "undoable") {
      void update.catch(() => {});
      close();
      return;
    }
    try {
      await update;
      notify("chelone.notification.updated", {
        type: "info",
        messageArgs: { smart_count: 1 },
      });
      close();
    } catch {
      notify("chelone.notification.http_error", { type: "error" });
    }
  };

  return (
    <Card
      role="listitem"
      data-slot="approval-queue-row"
      data-record-id={String(record.id)}
      className="gap-3 p-4 text-sm"
    >
      <RecordContextProvider value={record}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span data-slot="approval-queue-title" className="font-medium">
              {title}
            </span>
            {isEmpty(subtitle) ? null : (
              <span
                data-slot="approval-queue-subtitle"
                className="text-muted-foreground"
              >
                {String(subtitle)}
              </span>
            )}
          </div>
          {rowExtra?.(record)}
          {isRejected ? (
            <span
              data-slot="approval-queue-rejected"
              className="text-muted-foreground"
            >
              {translate("chelone.approval_queue.rejected", {
                _: "Rejected",
              })}
            </span>
          ) : (
            // A disabled fieldset disables the Approve button inside it.
            <fieldset
              disabled={updating}
              className="m-0 flex min-w-0 items-center gap-2 border-0 p-0"
            >
              <DualApprovalButton<TRecord>
                required={required}
                approverSource={approverSource}
                statusSource={statusSource}
                pendingValue={pendingValue}
                approvedValue={approvedValue}
                mutationMode={mutationMode}
              />
              {canAccess && !isAccessPending ? (
                <Button
                  type="button"
                  variant="outline"
                  data-slot="approval-queue-reject"
                  disabled={!identity || open}
                  onClick={() => setOpen(true)}
                >
                  {translate("chelone.approval.reject", { _: "Reject" })}
                </Button>
              ) : null}
            </fieldset>
          )}
        </div>
        {open ? (
          <form
            data-slot="approval-queue-reason-form"
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <Label htmlFor={reasonId}>
              {translate("chelone.approval_queue.reason", { _: "Reason" })}
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {translate("chelone.action.cancel", { _: "Cancel" })}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!rejection || isPending || updating}
              >
                {translate("chelone.approval_queue.confirm_reject", {
                  _: "Confirm reject",
                })}
              </Button>
            </div>
          </form>
        ) : null}
      </RecordContextProvider>
    </Card>
  );
}

/**
 * The records of the ambient `<List>` as a queue, one card per record with the
 * `<DualApprovalButton>` and a Reject that asks for a reason before it writes
 * the rejected status, the reason and the signed-in user. It fetches nothing:
 * filter the `<List>` on pending and a decided row leaves once the update's
 * refetch lands. Reject needs `edit` access and an identity.
 *
 * This is a UI rule, not a security one: the server has to enforce who may
 * approve or reject.
 *
 * @example
 * <List filter={{ status: "pending" }}>
 *   <ApprovalQueue titleSource="title" subtitleSource="author" required={2} />
 * </List>
 */
function ApprovalQueue<TRecord extends ResourceRecord = LooseRecord>({
  className,
  ...rowProps
}: ApprovalQueueProps<TRecord>) {
  const { data, isPending } = useListContext<TRecord>();
  const translate = useTranslate();

  if (isPending) return null;
  if (!data || data.length === 0) {
    return (
      <p
        data-slot="approval-queue-empty"
        className="py-6 text-center text-sm text-muted-foreground"
      >
        {translate("chelone.approval_queue.empty", {
          _: "No items waiting for approval",
        })}
      </p>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: the rows are cards, not list markup, so a ul would add bullets and a list-style reset
    <div
      role="list"
      data-slot="approval-queue"
      className={cn("flex flex-col gap-3", className)}
    >
      {data.map((record) => (
        <ApprovalQueueRow<TRecord>
          key={record.id}
          record={record}
          {...rowProps}
        />
      ))}
    </div>
  );
}

export { ApprovalQueue };
