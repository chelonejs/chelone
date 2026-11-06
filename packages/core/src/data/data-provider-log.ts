import { createMicroStore, type MicroStore } from "../store/micro-store";

/** One settled data provider call. */
export interface DataProviderLogEntry {
  /** Starts at 1 and grows by one per call, in the order calls start. */
  id: number;
  /** The property name called on the provider: a verb or a custom method. */
  method: string;
  /** The first argument when it is a string, else `""`. */
  resource: string;
  /** The second argument as passed. */
  // type-escape: a provider's params and results are whatever the app's methods take and give
  params: unknown;
  status: "ok" | "error";
  durationMs: number;
  /** ISO timestamp taken at the start of the call. */
  at: string;
  /** What the call resolved with. Present when `status` is `"ok"`. */
  // type-escape: see params
  result?: unknown;
  /** The error's message, or `String(err)` for a non-Error. Present when `status` is `"error"`. */
  error?: string;
}

export interface DataProviderLogOptions {
  /** How many of the newest entries to keep. A value below 1 reads as 1. */
  maxEntries?: number;
  /** Timer for `durationMs`. */
  now?: () => number;
  /** Wall clock for `at`. */
  clock?: () => Date;
}

export interface DataProviderLog {
  store: MicroStore<{ entries: readonly DataProviderLogEntry[] }>;
  /**
   * Returns a copy of the provider whose every function property records its
   * calls. The original is never modified.
   */
  wrap<TProvider extends object>(dataProvider: TProvider): TProvider;
  /** Empties the entries. Ids keep counting. */
  clear(): void;
}

/**
 * Runs `call` and returns a promise for it: a synchronous throw becomes a
 * rejection and a native promise is chained on directly, so entries land in
 * the order calls settle (resolving a new promise with it would defer them to
 * the order calls started).
 */
// type-escape: wraps any provider method, whose result type is unknown here
function settled(call: () => unknown): Promise<unknown> {
  try {
    return Promise.resolve(call());
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * A log of every call through a wrapped data provider, kept in a store both
 * adapters subscribe to. Wrap once, as `withLifecycleCallbacks` does.
 */
export function createDataProviderLog({
  maxEntries = 50,
  now = () => performance.now(),
  clock = () => new Date(),
}: DataProviderLogOptions = {}): DataProviderLog {
  const limit = maxEntries >= 1 ? Math.floor(maxEntries) : 1;
  const store = createMicroStore<{ entries: readonly DataProviderLogEntry[] }>({
    entries: [],
  });
  let lastId = 0;

  const record = (entry: DataProviderLogEntry): void => {
    store.setState((prev) => ({
      entries: [...prev.entries, entry].slice(-limit),
    }));
  };

  const wrap = <TProvider extends object>(dataProvider: TProvider) => {
    const copy = { ...dataProvider };
    for (const [method, value] of Object.entries(dataProvider)) {
      if (typeof value !== "function") continue;
      // type-escape: the wrapper forwards any arguments and results of any method
      const logged = (...args: unknown[]): Promise<unknown> => {
        const id = ++lastId;
        const at = clock().toISOString();
        const started = now();
        const [resource, params] = args;
        const base = {
          id,
          method,
          resource: typeof resource === "string" ? resource : "",
          params,
          at,
        };
        return settled(() => Reflect.apply(value, dataProvider, args)).then(
          (result) => {
            record({
              ...base,
              status: "ok",
              durationMs: now() - started,
              result,
            });
            return result;
          },
          // type-escape: a rejection can be any value
          (err: unknown) => {
            record({
              ...base,
              status: "error",
              durationMs: now() - started,
              error: err instanceof Error ? err.message : String(err),
            });
            throw err;
          },
        );
      };
      Object.defineProperty(copy, method, {
        value: logged,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return copy;
  };

  return {
    store,
    wrap,
    clear: () => store.setState({ entries: [] }),
  };
}
