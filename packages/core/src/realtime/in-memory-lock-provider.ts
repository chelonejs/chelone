import { lockResourceTopic, lockTopic } from "./topics";
import {
  type Lock,
  LockConflictError,
  type LockProvider,
  type RealtimeTransport,
} from "./types";

export interface InMemoryLockProviderOptions {
  /** Told of each lock and unlock, on the record's and the resource's topic. */
  publisher?: Pick<RealtimeTransport, "publish">;
}

// A JSON array cannot be forged by a resource name holding a separator.
const storeKey = (resource: string, id: unknown) =>
  JSON.stringify([resource, String(id)]);

/** A `LockProvider` kept in a `Map`, for tests and demos. */
export function inMemoryLockProvider({
  publisher,
}: InMemoryLockProviderOptions = {}): LockProvider {
  const store = new Map<string, Lock>();

  const announce = async (type: "locked" | "unlocked", lock: Lock) => {
    if (!publisher) return;
    const event = { type, payload: lock };
    try {
      await Promise.all([
        publisher.publish(lockTopic(lock.resource, lock.recordId), event),
        publisher.publish(lockResourceTopic(lock.resource), event),
      ]);
    } catch {
      // The lock is already taken or released: a failed announcement must not
      // report it as failed.
    }
  };

  return {
    async lock(resource, { id, identity }) {
      const key = storeKey(resource, id);
      const existing = store.get(key);
      if (existing) {
        if (String(existing.identity) !== String(identity)) {
          throw new LockConflictError(existing);
        }
        return existing;
      }
      const lock: Lock = {
        resource,
        recordId: id,
        identity,
        createdAt: new Date().toISOString(),
      };
      store.set(key, lock);
      await announce("locked", lock);
      return lock;
    },
    async unlock(resource, { id, identity }) {
      const key = storeKey(resource, id);
      const existing = store.get(key);
      if (!existing) {
        throw new Error(`No lock on ${resource}/${String(id)} to release`);
      }
      if (String(existing.identity) !== String(identity)) {
        throw new LockConflictError(existing);
      }
      store.delete(key);
      await announce("unlocked", existing);
      return existing;
    },
    async getLock(resource, { id }) {
      return store.get(storeKey(resource, id)) ?? null;
    },
    async getLocks(resource) {
      return [...store.values()].filter((lock) => lock.resource === resource);
    },
  };
}
