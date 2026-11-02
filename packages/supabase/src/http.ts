import type { FetchJsonResult } from "@chelone/core";
import { fetchUtils } from "@chelone/core";

/** Anything that can say who is signed in; a `SupabaseClient` fits. */
export interface SupabaseSessionSource {
  auth: {
    getSession(): Promise<{
      data: { session: { access_token: string } | null };
    }>;
  };
}

export interface SupabaseRequestOptions {
  /** `<instanceUrl>/rest/v1`. */
  baseUrl: string;
  apiKey: string;
  client?: SupabaseSessionSource;
  schema?: string;
  /** Merged last, so these win over every header set here. */
  headers?: HeadersInit;
}

/**
 * A PostgREST call with the user's own session, so row level security applies.
 * With no session no `Authorization` goes out: a `sb_publishable_` key is not
 * a JWT and must not be sent as a Bearer token.
 */
export async function supabaseRequest(
  { baseUrl, apiKey, client, schema, headers: extra }: SupabaseRequestOptions,
  path: string,
  init: RequestInit = {},
): Promise<FetchJsonResult> {
  const session = client ? (await client.auth.getSession()).data.session : null;
  const headers = new Headers({ apikey: apiKey });
  const method = (init.method ?? "GET").toUpperCase();
  if (schema) {
    const isRead = method === "GET" || method === "HEAD";
    headers.set(isRead ? "Accept-Profile" : "Content-Profile", schema);
  }
  for (const source of [init.headers, extra]) {
    new Headers(source).forEach((value, name) => {
      headers.set(name, value);
    });
  }
  return fetchUtils.fetchJson(`${baseUrl}${path}`, {
    ...init,
    headers,
    token: session?.access_token,
  });
}
