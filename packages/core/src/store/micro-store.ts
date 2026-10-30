/**
 * Single-object observable state for controllers. Distinct from the keyed KV
 * CheloneStore (preferences): one object, whole-snapshot subscription, and an
 * explicit destroy() lifecycle for observer teardown.
 */
export interface MicroStore<T> {
  getSnapshot(): T;
  setState(update: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(callback: () => void): () => void;
  destroy(): void;
  onDestroy(cleanup: () => void): void;
}

export interface MicroStoreOptions {
  /**
   * Called when the subscriber count goes 0 -> 1 (attach). May return a
   * teardown, called when the count returns to 0 (detach) AND on destroy()
   * while attached. Re-subscription after detach re-invokes onSubscribed
   * (attach/detach cycles are re-entrant — Activity hide/show).
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: `| void` (not `| undefined`) keeps teardown-less callbacks like `() => {}` assignable — the useEffect-cleanup convention.
  onSubscribed?: () => (() => void) | void;
}

/** One entry per subscribe() call — exact bookkeeping even for duplicate callbacks. */
interface Subscription {
  callback: () => void;
}

export function createMicroStore<T extends object>(
  initial: T,
  options?: MicroStoreOptions,
): MicroStore<T> {
  let state = initial;
  let destroyed = false;
  let attachTeardown: (() => void) | undefined;
  const subscriptions = new Set<Subscription>();
  const cleanups = new Set<() => void>();

  /** Runs the attach teardown at most once per attach cycle. */
  const detach = (): void => {
    const teardown = attachTeardown;
    attachTeardown = undefined;
    teardown?.();
  };

  return {
    getSnapshot: () => state,
    setState(update) {
      if (destroyed) return;
      const patch = typeof update === "function" ? update(state) : update;
      let changed = false;
      for (const [key, value] of Object.entries(patch)) {
        if (!Object.is(state[key as keyof T], value)) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      for (const subscription of subscriptions) subscription.callback();
    },
    subscribe(callback) {
      // A destroyed store never re-attaches: acquisition after destroy would
      // resurrect resources nothing will ever release.
      if (destroyed) return () => {};
      const subscription: Subscription = { callback };
      const isFirst = subscriptions.size === 0;
      // Register BEFORE attaching so an onSubscribed that synchronously calls
      // setState still notifies the subscriber that triggered the attach.
      subscriptions.add(subscription);
      if (isFirst && options?.onSubscribed) {
        attachTeardown = options.onSubscribed() ?? undefined;
      }
      return () => {
        // Idempotent: a second call must not decrement someone else's count.
        if (!subscriptions.delete(subscription)) return;
        if (subscriptions.size === 0 && !destroyed) detach();
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      detach(); // runs the attach teardown when attached; no-op when detached
      for (const cleanup of cleanups) cleanup();
      cleanups.clear();
      subscriptions.clear();
    },
    onDestroy(cleanup) {
      if (destroyed) {
        cleanup();
        return;
      }
      cleanups.add(cleanup);
    },
  };
}
