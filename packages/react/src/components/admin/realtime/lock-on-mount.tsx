import { type Identifier, type Lock, LockConflictError } from "@chelone/core";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslate } from "../../../i18n-hooks";
import { useLockOnMount } from "../../../lock-hooks";

export interface LockOnMountProps {
  /** Shown only while this component holds the lock. */
  children: ReactNode;
  /** Defaults to the resource context. */
  resource?: string;
  /** Defaults to the id of the record context. */
  id?: Identifier;
  /** Defaults to the auth provider's identity. */
  identity?: Identifier;
  meta?: Record<string, unknown>;
  /** Shown while the lock is requested. Defaults to a `Skeleton`. */
  loading?: ReactNode;
  /** Shown when another identity holds the lock. Defaults to an `Alert` naming the holder. */
  lockedBy?: (lock: Lock) => ReactNode;
  /** Called with a failed lock or release. A new function every render never relocks. */
  onLockError?: (error: Error) => void;
}

/**
 * Locks a record while mounted and renders its children once it holds the
 * lock. Needs a realtime data provider with lock support.
 *
 * @example
 * import { LockOnMount } from "@chelone/react";
 *
 * export const PostForm = () => (
 *   <LockOnMount>
 *     <PostFields />
 *   </LockOnMount>
 * );
 */
function LockOnMount({
  children,
  loading,
  lockedBy,
  ...options
}: LockOnMountProps) {
  const translate = useTranslate();
  const { lock, isLocking, lockError } = useLockOnMount(options);

  if (isLocking) return loading ?? <Skeleton className="h-8 w-full" />;
  if (lockError instanceof LockConflictError) {
    const { existingLock } = lockError;
    return (
      lockedBy?.(existingLock) ?? (
        <Alert>
          {translate("chelone.lock.locked_by", {
            _: "Locked by {identity}",
            identity: String(existingLock.identity),
          })}
        </Alert>
      )
    );
  }
  return lock ? children : null;
}

export { LockOnMount };
