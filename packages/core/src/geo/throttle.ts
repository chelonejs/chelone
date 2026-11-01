export interface ThrottleOptions {
  /** Least time between the starts of two calls that pass `wait`. */
  minIntervalMs: number;
  /** Clock in ms; defaults to `Date.now`. Injected by tests. */
  now?: () => number;
  /** Resolves after `ms`; defaults to a timer. Injected by tests. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export interface Throttle {
  /**
   * Resolves when the caller may go ahead. Concurrent callers queue behind
   * each other, and a call that aborts while waiting rejects with an
   * `AbortError` and gives up its place.
   */
  wait(signal?: AbortSignal): Promise<void>;
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

function timerSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createThrottle(options: ThrottleOptions): Throttle {
  const { minIntervalMs, now = Date.now, sleep = timerSleep } = options;
  let nextAllowedAt = Number.NEGATIVE_INFINITY;
  let tail: Promise<unknown> = Promise.resolve();

  const takeTurn = async (signal?: AbortSignal) => {
    if (signal?.aborted) throw abortError();
    const delay = nextAllowedAt - now();
    if (delay > 0) await sleep(delay, signal);
    if (signal?.aborted) throw abortError();
    nextAllowedAt = now() + minIntervalMs;
  };

  return {
    wait(signal) {
      if (signal?.aborted) return Promise.reject(abortError());
      const turn = tail.then(() => takeTurn(signal));
      tail = turn.catch(() => undefined);
      if (!signal) return turn;
      // Leave the queue at once on abort, even if `sleep` ignores the signal.
      return new Promise<void>((resolve, reject) => {
        const onAbort = () => reject(abortError());
        signal.addEventListener("abort", onAbort, { once: true });
        turn.then(resolve, reject).finally(() =>
          signal.removeEventListener("abort", onAbort),
        );
      });
    },
  };
}
