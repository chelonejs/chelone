import type { Identifier, Lock } from "@chelone/core";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslate } from "../../../i18n-hooks";
import { useGetLockLive } from "../../../lock-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";

export interface LockStatusProps {
  /** Defaults to the resource context. */
  resource?: string;
  /** Defaults to the id of the record context. */
  id?: Identifier;
  /** Replaces the default badge naming the holder. */
  renderLock?: (lock: Lock) => ReactNode;
  /** Rendered when the record is free. Defaults to nothing. */
  renderFree?: () => ReactNode;
}

/**
 * Shows who holds a record's lock, and updates when it is taken or released.
 * Needs a realtime data provider with lock support.
 *
 * @example
 * import { LockStatus } from "@chelone/react";
 *
 * export const PostLockStatus = () => <LockStatus />;
 */
function LockStatus({
  resource: resourceProp,
  id: idProp,
  renderLock,
  renderFree,
}: LockStatusProps) {
  const translate = useTranslate();
  const resource = useResourceContext({ resource: resourceProp });
  const record = useRecordContext();
  const id = idProp ?? record?.id;
  const enabled = !!resource && id !== undefined && id !== null;

  // The hook needs a resource and an id to build its query; with `enabled`
  // false it neither fetches nor subscribes, so the casts are never read.
  const { data: lock, isSuccess } = useGetLockLive(
    resource as string,
    { id: id as Identifier },
    { enabled },
  );

  if (!enabled) return null;
  if (lock) {
    return (
      renderLock?.(lock) ?? (
        <Badge variant="secondary">
          {translate("chelone.lock.locked_by", {
            _: "Locked by {identity}",
            identity: String(lock.identity),
          })}
        </Badge>
      )
    );
  }
  // Only a settled `null` is free: while loading or after a failed fetch the holder is unknown.
  return isSuccess ? (renderFree?.() ?? null) : null;
}

export { LockStatus };
