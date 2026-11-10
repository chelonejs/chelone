/**
 * `<StatusTransitionButton>` — a menu of the states the ambient record may move
 * to. Ported from shadmin `buttons/status-transition-button.tsx` and rebuilt on
 * `useUpdate` the way `<UpdateButton>` is, with the allowed set decided by
 * core's `getAllowedTransitions`.
 *
 * Divergences from shadmin:
 * - `confirm` opens `<Confirm>` instead of the native `window.confirm`, which
 *   cannot be translated or tested.
 * - `onTransition` runs after the update resolves, not when it is sent, so a
 *   failed update never reports a move. In undoable mode it runs when the Undo
 *   notification is queued.
 * - Defaults to `mutationMode="pessimistic"`, so the screen never shows a move
 *   the server refused. `useUpdate` notifies only in undoable mode, so the
 *   button notifies `updated` / `http_error` itself for the other modes.
 * - shadmin's `data-status-trigger` attribute is a `data-slot` here.
 */

import {
  getAllowedTransitions,
  isLooseRecord,
  type MutationMode,
  type RegisteredAnyRecord,
  type ResourceRecord,
} from "@chelone/core";
import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdate } from "../../../hooks";
import { useNotify } from "../../../notification-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { Confirm } from "../feedback/confirm";
import { useMenuAccess } from "../layout/use-menu-access";

interface StatusTransitionButtonProps<
  TRecord extends ResourceRecord = RegisteredAnyRecord,
> {
  /** Record field holding the status, a top-level key. Default `"status"`. */
  source?: keyof TRecord & string;
  /** The states each state may move to. */
  transitions: Record<string, readonly string[]>;
  /** Predicates keyed `"<from>-><to>"`. A transition with no guard is allowed. */
  guards?: Record<string, (record: TRecord) => boolean>;
  /** Text for a state. A state with no entry shows as it is. */
  labels?: Record<string, string>;
  resource?: string;
  record?: TRecord;
  /** Ask for confirmation before the update. */
  confirm?: boolean;
  /** Default `"pessimistic"`; `"undoable"` shows an Undo notification. */
  mutationMode?: MutationMode;
  /**
   * Runs once the update has resolved, or, in undoable mode, once the Undo
   * notification is queued. Not called when the update fails.
   */
  onTransition?: (from: string, to: string, record: TRecord) => void;
  className?: string;
}

/**
 * A dropdown that moves the current record to one of the states its current
 * state allows. Reads the record and resource from context; renders nothing
 * without a record, a resource or `edit` access.
 *
 * @example
 * import { Edit, StatusTransitionButton, TextInput } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit
 *     actions={
 *       <StatusTransitionButton
 *         transitions={{ draft: ["review"], review: ["published", "draft"] }}
 *         guards={{ "review->published": (post) => Boolean(post.title) }}
 *         confirm
 *       />
 *     }
 *   >
 *     <TextInput source="title" />
 *   </Edit>
 * );
 */
function StatusTransitionButton<
  TRecord extends ResourceRecord = RegisteredAnyRecord,
>(props: StatusTransitionButtonProps<TRecord>) {
  const {
    source,
    transitions,
    guards,
    labels,
    confirm = false,
    mutationMode = "pessimistic",
    onTransition,
    className,
  } = props;
  const statusKey: string = source ?? "status";
  const record = useRecordContext<TRecord>(props);
  const resource = useResourceContext(props);
  const notify = useNotify();
  const [target, setTarget] = useState<string | null>(null);
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

  const { current, allowed } = getAllowedTransitions(record, {
    source,
    transitions,
    guards,
  });
  const labelOf = (state: string) => labels?.[state] ?? state;

  const run = async (next: string) => {
    const update = mutateAsync({
      id: record.id,
      data: { [statusKey]: next },
      previousData: record,
    });
    if (mutationMode === "optimistic") setTarget(null);
    try {
      await update;
      // An undoable `useUpdate` notifies with Undo itself.
      if (mutationMode !== "undoable") {
        notify("chelone.notification.updated", {
          type: "info",
          messageArgs: { smart_count: 1 },
        });
      }
      onTransition?.(current, next, record);
    } catch {
      notify("chelone.notification.http_error", { type: "error" });
    } finally {
      setTarget(null);
    }
  };

  const choose = (next: string) => {
    if (confirm) setTarget(next);
    else void run(next);
  };

  return (
    <Fragment>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-slot="status-transition-trigger"
            className={className}
            disabled={allowed.length === 0 || isPending}
          >
            {current === "" ? "-" : labelOf(current)}
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {allowed.map((state) => (
            <DropdownMenuItem key={state} onSelect={() => choose(state)}>
              {labelOf(state)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Confirm
        isOpen={target !== null}
        loading={isPending}
        title="chelone.status_transition.confirm_title"
        titleTranslateOptions={{ _: "Change status?" }}
        content="chelone.status_transition.confirm_content"
        contentTranslateOptions={{
          _: "Move to {status}?",
          status: target === null ? "" : labelOf(target),
        }}
        onConfirm={(e) => {
          e.stopPropagation();
          if (target !== null) void run(target);
        }}
        onClose={() => setTarget(null)}
      />
    </Fragment>
  );
}

export { StatusTransitionButton, type StatusTransitionButtonProps };
