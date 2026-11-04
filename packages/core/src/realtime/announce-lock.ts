import { lockResourceTopic, lockTopic } from "./topics";
import type { Lock, RealtimeTransport } from "./types";

/**
 * Tells a publisher of a lock or an unlock, on the record's and the
 * resource's topic. A failed publish is swallowed: the lock is already taken
 * or released, so a failed announcement must not report it as failed.
 */
export async function announceLock(
  publisher: Pick<RealtimeTransport, "publish"> | undefined,
  type: "locked" | "unlocked",
  lock: Lock,
): Promise<void> {
  if (!publisher) return;
  const event = { type, payload: lock };
  try {
    await Promise.all([
      publisher.publish(lockTopic(lock.resource, lock.recordId), event),
      publisher.publish(lockResourceTopic(lock.resource), event),
    ]);
  } catch {
    // Deliberately ignored, see above.
  }
}
