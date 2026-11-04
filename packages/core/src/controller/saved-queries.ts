import type { FilterPayload, SortPayload } from "../data/types";
import { isPlainObject, isRecord } from "../guards";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { ListControllerContext } from "./list-controller";

export interface SavedQueryValue {
  filter: FilterPayload;
  displayedFilters: Record<string, boolean>;
  sort: SortPayload[];
  perPage: number;
}

export interface SavedQuery {
  label: string;
  value: SavedQueryValue;
}

export interface SavedQueriesState {
  queries: SavedQuery[];
}

export interface SavedQueriesController extends MicroStore<SavedQueriesState> {
  /** Trims the label, ignores a blank one, replaces a same-label query in place, else appends. */
  save(label: string, value: SavedQueryValue): void;
  remove(label: string): void;
}

export interface SavedQueriesControllerOptions {
  /** KV namespace, same as the list controller's. Default: the resource name. */
  storeKey?: string;
}

/** The key ra-core's `useSavedQueries` uses. */
export function savedQueriesKey(storeKey: string): string {
  return `${storeKey}.savedQueries`;
}

const isSortPayload = (value: unknown): value is SortPayload =>
  isRecord(value) &&
  typeof value.field === "string" &&
  (value.order === "ASC" || value.order === "DESC");

function isSavedQueryValue(value: unknown): value is SavedQueryValue {
  return (
    isRecord(value) &&
    isRecord(value.filter) &&
    isRecord(value.displayedFilters) &&
    Object.values(value.displayedFilters).every(
      (flag) => typeof flag === "boolean",
    ) &&
    Array.isArray(value.sort) &&
    value.sort.every(isSortPayload) &&
    typeof value.perPage === "number" &&
    Number.isInteger(value.perPage) &&
    value.perPage > 0
  );
}

/**
 * Reads whatever storage holds: non-arrays give `[]`, malformed entries are
 * dropped, labels are trimmed, and a repeated label keeps its first entry.
 */
export function extractValidSavedQueries(raw: unknown): SavedQuery[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const queries: SavedQuery[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.label !== "string") continue;
    const label = entry.label.trim();
    if (!label || seen.has(label) || !isSavedQueryValue(entry.value)) continue;
    seen.add(label);
    queries.push({ label, value: entry.value });
  }
  return queries;
}

/**
 * Structural equality; object key order is irrelevant, array order is not.
 * Only plain objects, arrays and dates compare by content: any other class
 * instance is equal to itself alone.
 */
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isDeepEqual(item, b[index]))
    );
  }
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && isDeepEqual(a[key], b[key]))
  );
}

/** Whether `current` list params are the saved query. `displayedFilters` is ignored. */
export function isSavedQueryActive(
  query: SavedQueryValue,
  current: SavedQueryValue,
): boolean {
  return (
    query.perPage === current.perPage &&
    isDeepEqual(query.sort, current.sort) &&
    isDeepEqual(query.filter, current.filter)
  );
}

/**
 * Named filter/sort sets persisted in the KV store.
 *
 * Lifecycle (Task 4R): construction is inert. The first subscriber subscribes
 * to the store key and re-reads it; the last unsubscribe releases it. Detached,
 * a write still updates local state, and the next attach picks up whatever the
 * store holds.
 */
export function createSavedQueriesController(
  ctx: Pick<ListControllerContext, "store">,
  resource: string,
  options: SavedQueriesControllerOptions = {},
): SavedQueriesController {
  const key = savedQueriesKey(options.storeKey ?? resource);
  const kv = ctx.store;

  /** The raw value the state was last derived from, to skip no-op resyncs. */
  let lastRaw: unknown = kv?.getItem(key);
  const store = createMicroStore<SavedQueriesState>(
    { queries: extractValidSavedQueries(lastRaw) },
    {
      onSubscribed: () => {
        if (!kv) return;
        resync();
        return kv.subscribe(key, resync);
      },
    },
  );

  /** Brings state in line with the store; a no-op when nothing changed. */
  function resync(): void {
    if (!kv) return;
    const raw = kv.getItem(key);
    if (raw === lastRaw) return;
    lastRaw = raw;
    const queries = extractValidSavedQueries(raw);
    if (isDeepEqual(queries, store.getSnapshot().queries)) return;
    store.setState({ queries });
  }

  /**
   * Detached, nothing keeps state current, so every action starts from the
   * store: a stale snapshot would write over another controller's queries.
   */
  const current = (): SavedQuery[] => {
    resync();
    return store.getSnapshot().queries;
  };

  const write = (queries: SavedQuery[]): void => {
    if (!kv) {
      store.setState({ queries });
      return;
    }
    // A throwing `setItem` changes nothing. Re-reading afterwards covers
    // stores that clone on write and a store notification that wrote again.
    kv.setItem(key, queries);
    resync();
  };

  const save = (label: string, value: SavedQueryValue): void => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (!isSavedQueryValue(value)) return;
    const next: SavedQuery = { label: trimmed, value: structuredClone(value) };
    const queries = current();
    const index = queries.findIndex((query) => query.label === trimmed);
    write(
      index === -1
        ? [...queries, next]
        : queries.map((query, i) => (i === index ? next : query)),
    );
  };

  const remove = (label: string): void => {
    const trimmed = label.trim();
    const queries = current();
    if (!queries.some((query) => query.label === trimmed)) return;
    write(queries.filter((query) => query.label !== trimmed));
  };

  return { ...store, save, remove };
}
