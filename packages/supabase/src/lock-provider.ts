import type {
  Identifier,
  Lock,
  LockProvider,
  RealtimeTransport,
} from "@chelone/core";
import { announceLock, HttpError, LockConflictError } from "@chelone/core";
import type { SupabaseSessionSource } from "./http";
import { supabaseRequest } from "./http";
import { toQueryString } from "./postgrest/query-string";

export interface SupabaseLockProviderOptions {
  instanceUrl: string;
  /** A legacy anon key or a `sb_publishable_` key. */
  apiKey: string;
  /** Supplies the session whose token authorises each call. */
  client?: SupabaseSessionSource;
  /** The table holding the locks. Defaults to `chelone_locks`. */
  table?: string;
  schema?: string;
  /** Told of each lock and unlock, on the record's and the resource's topic. */
  publisher?: Pick<RealtimeTransport, "publish">;
}

interface LockRow {
  resource: string;
  record_id: string | number;
  identity: string | number;
  created_at: string;
}

const isLockRow = (value: unknown): value is LockRow =>
  typeof value === "object" &&
  value !== null &&
  "resource" in value &&
  typeof value.resource === "string" &&
  "record_id" in value &&
  (typeof value.record_id === "string" ||
    typeof value.record_id === "number") &&
  "identity" in value &&
  (typeof value.identity === "string" || typeof value.identity === "number") &&
  "created_at" in value &&
  typeof value.created_at === "string";

const toLock = (row: LockRow): Lock => ({
  resource: row.resource,
  recordId: String(row.record_id),
  identity: String(row.identity),
  createdAt: row.created_at,
});

// type-escape: json: the parsed body of a response.
const toLocks = (json: unknown): Lock[] =>
  Array.isArray(json) ? json.filter(isLockRow).map(toLock) : [];

/**
 * A `LockProvider` that keeps locks in a Supabase table every user shares.
 * The table needs `primary key (resource, record_id)`, and policies that let a
 * signed-in user read every row and write only rows whose `identity` is their
 * own id. A lock never expires: clear stale rows with a scheduled delete.
 */
export function supabaseLockProvider({
  instanceUrl,
  apiKey,
  client,
  table = "chelone_locks",
  schema,
  publisher,
}: SupabaseLockProviderOptions): LockProvider {
  const baseUrl = `${instanceUrl.replace(/\/+$/, "")}/rest/v1`;

  const request = (
    pairs: ReadonlyArray<readonly [string, string]>,
    init?: RequestInit,
  ) =>
    supabaseRequest(
      { baseUrl, apiKey, client, schema },
      `/${encodeURIComponent(table)}?${toQueryString(pairs)}`,
      init,
    );

  const recordPairs = (resource: string, id: Identifier) =>
    [
      ["resource", `eq.${resource}`],
      ["record_id", `eq.${String(id)}`],
    ] as const;

  const read = async (resource: string, id: Identifier) => {
    const { json } = await request([
      ...recordPairs(resource, id),
      ["limit", "1"],
    ]);
    return toLocks(json)[0] ?? null;
  };

  const insert = async (
    resource: string,
    id: Identifier,
    identity: Identifier,
  ) => {
    const { json } = await request([], {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        resource,
        record_id: String(id),
        identity: String(identity),
      }),
    });
    const [lock] = toLocks(json);
    if (!lock) {
      throw new Error(`No lock on ${resource}/${String(id)} came back`);
    }
    return lock;
  };

  return {
    async lock(resource, { id, identity }) {
      let lock: Lock;
      try {
        lock = await insert(resource, id, identity);
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 409)) throw error;
        const existing = await read(resource, id);
        if (existing) {
          if (existing.identity !== String(identity)) {
            throw new LockConflictError(existing);
          }
          return existing;
        }
        // The holder released it between our insert and our read.
        lock = await insert(resource, id, identity);
      }
      await announceLock(publisher, "locked", lock);
      return lock;
    },
    async unlock(resource, { id, identity }) {
      const { json } = await request(
        [...recordPairs(resource, id), ["identity", `eq.${String(identity)}`]],
        { method: "DELETE", headers: { Prefer: "return=representation" } },
      );
      const [deleted] = toLocks(json);
      if (deleted) {
        await announceLock(publisher, "unlocked", deleted);
        return deleted;
      }
      const existing = await read(resource, id);
      if (!existing) {
        throw new Error(`No lock on ${resource}/${String(id)} to release`);
      }
      if (existing.identity !== String(identity)) {
        throw new LockConflictError(existing);
      }
      throw new Error(
        `The lock on ${resource}/${String(id)} could not be released`,
      );
    },
    getLock(resource, { id }) {
      return read(resource, id);
    },
    async getLocks(resource) {
      const { json } = await request([
        ["resource", `eq.${resource}`],
        ["order", "created_at.asc"],
      ]);
      return toLocks(json);
    },
  };
}
