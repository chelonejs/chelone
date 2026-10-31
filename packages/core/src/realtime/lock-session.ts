import type { AuthProvider } from "../auth/types";
import type { Identifier } from "../resource/identifier";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { Lock, LockProvider } from "./types";

export type LockSessionDataProvider = Pick<LockProvider, "lock" | "unlock">;

export interface LockSessionState {
  lock: Lock | null;
  isLocking: boolean;
  error: Error | null;
}

export interface LockSessionOptions {
  dataProvider: LockSessionDataProvider;
  resource: string;
  id: Identifier;
  getIdentity: () => Promise<Identifier>;
  meta?: Record<string, unknown>;
  /** Called with a failed lock or release. */
  onError?: (error: Error) => void;
}

export interface LockSession {
  store: MicroStore<LockSessionState>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Takes a record's lock on `start()` and gives it back on `stop()`. Steps run
 * one after another, so a `stop()` that arrives while `lock` is in flight
 * releases the lock once it lands, and `start()`, `stop()`, `start()` in one
 * tick ends holding it. Locks carry no expiry: a crashed tab leaves its lock
 * until the lock provider drops it.
 */
export function createLockSession({
  dataProvider,
  resource,
  id,
  getIdentity,
  meta,
  onError,
}: LockSessionOptions): LockSession {
  const store = createMicroStore<LockSessionState>({
    lock: null,
    isLocking: false,
    error: null,
  });
  const metaParam = meta ? { meta } : {};

  // What the provider holds for us, whether or not the store has seen it yet.
  let held: { identity: Identifier } | null = null;
  let running = false;
  // Bumped by every start and stop: a step whose turn has passed stays out of the store.
  let epoch = 0;
  let queue: Promise<void> = Promise.resolve();

  const enqueue = (step: () => Promise<void>): Promise<void> => {
    queue = queue.then(step);
    return queue;
  };

  const acquire = async (myEpoch: number) => {
    const isCurrent = () => epoch === myEpoch;
    try {
      const identity = await getIdentity();
      const lock = await dataProvider.lock(resource, {
        id,
        identity,
        ...metaParam,
      });
      held = { identity };
      if (isCurrent()) store.setState({ lock, isLocking: false });
    } catch (cause) {
      if (!isCurrent()) return;
      const error = toError(cause);
      store.setState({ isLocking: false, error });
      onError?.(error);
    }
  };

  const release = async () => {
    if (!held) return;
    const { identity } = held;
    held = null;
    try {
      await dataProvider.unlock(resource, { id, identity, ...metaParam });
    } catch (cause) {
      onError?.(toError(cause));
    }
  };

  return {
    store,
    start() {
      if (running) return queue;
      running = true;
      const myEpoch = ++epoch;
      store.setState({ isLocking: true, error: null });
      return enqueue(() => acquire(myEpoch));
    },
    stop() {
      if (!running) return queue;
      running = false;
      epoch++;
      store.setState({ lock: null, isLocking: false, error: null });
      return enqueue(release);
    },
  };
}

/** The explicit identity wins; otherwise the auth provider's. */
export async function resolveLockIdentity(
  authProvider: AuthProvider | undefined,
  explicit?: Identifier,
): Promise<Identifier> {
  if (explicit !== undefined) return explicit;
  if (authProvider?.getIdentity) return (await authProvider.getIdentity()).id;
  throw new Error(
    "no identity available. Pass identity explicitly or configure an authProvider.",
  );
}
