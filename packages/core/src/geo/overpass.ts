import type { QueryFunctionContext } from "@tanstack/query-core";

export interface OverpassRequestOptions {
  signal?: AbortSignal;
}

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Readonly<Record<string, string>>;
};

/** The JSON body of an Overpass interpreter answer. */
export type OverpassAnswer = {
  elements: OverpassElement[];
  remark?: string;
};

/** True for a body with an `elements` array, which Overpass always sends. */
export function isOverpassAnswer(value: unknown): value is OverpassAnswer {
  return (
    typeof value === "object" &&
    value !== null &&
    "elements" in value &&
    Array.isArray(value.elements)
  );
}

export interface OverpassProvider {
  name: string;
  /**
   * Stands in for `name` in query keys. Set it when two providers of one
   * `name` can answer differently, such as by endpoint.
   */
  cacheKey?: string;
  /** Runs an Overpass QL query and resolves to the parsed JSON answer. */
  query(
    query: string,
    options?: OverpassRequestOptions,
  ): Promise<OverpassAnswer>;
}

export class OverpassError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OverpassError";
    this.status = status;
  }
}

export class OverpassRateLimitError extends OverpassError {
  constructor(message = "Overpass rate limit reached (429)") {
    super(message, 429);
    this.name = "OverpassRateLimitError";
  }
}

/** The server answered 504, or the client's own timeout fired. */
export class OverpassTimeoutError extends OverpassError {
  constructor(message = "Overpass query timed out", status?: number) {
    super(message, status);
    this.name = "OverpassTimeoutError";
  }
}

/**
 * A query that hits the server's time or memory limit still answers 200, with
 * the elements found so far and a `remark`. That partial list must not pass
 * for a complete one.
 */
function throwOnRuntimeError(answer: OverpassAnswer): void {
  const { remark } = answer;
  if (typeof remark !== "string" || !/^runtime error/i.test(remark.trim())) {
    return;
  }
  throw /timed out/i.test(remark)
    ? new OverpassTimeoutError(`Overpass ${remark.trim()}`)
    : new OverpassError(`Overpass ${remark.trim()}`);
}

export interface OverpassProviderOptions {
  /**
   * Overpass interpreter URL, such as `https://overpass-api.de/api/interpreter`.
   * There is no default: a public instance has a usage policy the app must
   * accept.
   */
  endpoint: string;
  /** Longest wait for one query. Defaults to 30000. */
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export function createOverpassProvider(
  options: OverpassProviderOptions,
): OverpassProvider {
  const { endpoint } = options;
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new TypeError(
      'createOverpassProvider: the "endpoint" option is required',
    );
  }
  const url = endpoint.trim();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const doFetch: typeof fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  return {
    name: "overpass",
    cacheKey: `overpass|${url}`,

    async query(query, { signal } = {}) {
      // Not `AbortSignal.timeout`: a caller's signal must not replace the
      // timer, and a fired timer must be told apart from a caller abort.
      const timer = new AbortController();
      let timedOut = false;
      const handle = setTimeout(() => {
        timedOut = true;
        timer.abort();
      }, timeoutMs);
      try {
        const response = await doFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }).toString(),
          signal: signal
            ? AbortSignal.any([signal, timer.signal])
            : timer.signal,
        });
        if (response.status === 429) throw new OverpassRateLimitError();
        if (response.status === 504) {
          throw new OverpassTimeoutError(
            "Overpass query timed out (504)",
            response.status,
          );
        }
        if (!response.ok) {
          throw new OverpassError(
            `Overpass query failed (${response.status})`,
            response.status,
          );
        }
        const answer: unknown = await response.json();
        if (!isOverpassAnswer(answer)) {
          throw new OverpassError("Overpass answered JSON without elements");
        }
        throwOnRuntimeError(answer);
        return answer;
      } catch (error) {
        if (timedOut && !(error instanceof OverpassError)) {
          throw new OverpassTimeoutError();
        }
        throw error;
      } finally {
        clearTimeout(handle);
      }
    },
  };
}

export interface OverpassQueryOptions {
  /** Defaults to 1 hour. */
  staleTime?: number;
}

export interface OverpassQuery {
  queryKey: readonly unknown[];
  queryFn: (
    context: Pick<QueryFunctionContext, "signal">,
  ) => Promise<OverpassAnswer>;
  enabled: boolean;
  staleTime: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Query options for `useQuery`; the query's `signal` reaches the provider. */
export function overpassQueryOptions(
  provider: OverpassProvider,
  query: string,
  options: OverpassQueryOptions = {},
): OverpassQuery {
  return {
    queryKey: ["overpass", provider.cacheKey ?? provider.name, query],
    queryFn: ({ signal }) => provider.query(query, { signal }),
    enabled: query.trim() !== "",
    staleTime: options.staleTime ?? ONE_HOUR_MS,
  };
}
