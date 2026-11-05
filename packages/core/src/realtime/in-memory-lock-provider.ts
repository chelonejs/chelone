import type { Identifier } from "../resource/identifier";
import { announceLock } from "./announce-lock";
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
const storeKey = (resource: string, id: Identifier) =>
  JSON.stringify([resource, String(id)]);

/** A `LockProvider` kept in a `Map`, for tests and demos. */
export function inMemoryLockProvider({
  publisher,
}: InMemoryLockProviderOptions = {}): LockProvider {
  const store = new Map<string, Lock>();

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
      await announceLock(publisher, "locked", lock);
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
      await announceLock(publisher, "unlocked", existing);
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
