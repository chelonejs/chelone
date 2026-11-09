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
  // type-escape: server: a provider's params and results are whatever the app's methods take and give
  params: unknown;
  status: "ok" | "error";
  durationMs: number;
  /** ISO timestamp taken at the start of the call. */
  at: string;
  /** What the call resolved with. Present when `status` is `"ok"`. */
  // type-escape: server: see params
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
// type-escape: server: wraps any provider method, whose result type is unknown here
function settled(call: () => unknown): Promise<unknown> {
  try {
    return Promise.resolve(call());
  } catch (err) {
    return Promise.reject(err);
  }
}

// type-escape: server: a provider method takes and gives whatever the app defines
type ProviderMethod = (...args: unknown[]) => unknown;

function isMethod(value: unknown): value is ProviderMethod {
  return typeof value === "function";
}

/**
 * The methods of a provider by name, own and inherited, so a class-based
 * provider's prototype methods are found. The nearest definition wins.
 */
function methodsOf(dataProvider: object): Map<string, ProviderMethod> {
  const methods = new Map<string, ProviderMethod>();
  const seen = new Set<string>();
  for (
    let level: object | null = dataProvider;
    level && level !== Object.prototype;
    level = Object.getPrototypeOf(level)
  ) {
    for (const [name, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(level),
    )) {
      if (name === "constructor" || seen.has(name)) continue;
      seen.add(name);
      if (isMethod(descriptor.value)) methods.set(name, descriptor.value);
    }
  }
  return methods;
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
    Object.setPrototypeOf(copy, Object.getPrototypeOf(dataProvider));
    for (const [method, value] of methodsOf(dataProvider)) {
      // type-escape: server: the wrapper forwards any arguments and results of any method
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
          // type-escape: server: a rejection can be any value
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
