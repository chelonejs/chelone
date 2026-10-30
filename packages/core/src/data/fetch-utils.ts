import { HttpError } from "./http-error";

export interface FetchJsonOptions extends RequestInit {
  /** Sent as `Authorization: Bearer <token>`. */
  token?: string;
}

export interface FetchJsonResult {
  status: number;
  statusText: string;
  headers: Headers;
  /** The response text. */
  body: string;
  /** The parsed body; `undefined` when the text is not JSON. */
  json: unknown;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// HTTP/2 responses carry no status text, so fall back to the code.
function errorMessage(json: unknown, response: Response): string {
  const message =
    json != null && typeof json === "object"
      ? (json as { message?: unknown }).message
      : undefined;
  if (typeof message === "string") return message;
  return response.statusText || `HTTP ${response.status}`;
}

/**
 * A thin call to the global `fetch`.
 *
 * - Resolves `{ status, statusText, headers, body, json }` on a 2xx; `json` is
 *   `undefined` when the text is not JSON.
 * - Rejects a non-2xx with an `HttpError` whose `body` is the parsed JSON.
 * - Rejects a network failure with the error `fetch` threw, unchanged.
 * - Sets `Accept: application/json`, and `Content-Type: application/json` for
 *   a string `body` when the caller set none.
 * - A non-empty `token` is sent as `Authorization: Bearer <token>` and wins
 *   over an `Authorization` header in `options.headers`; an empty one is
 *   ignored.
 */
async function fetchJson(
  url: string,
  options: FetchJsonOptions = {},
): Promise<FetchJsonResult> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  const body = await response.text();
  const json = parseJson(body);
  if (!response.ok) {
    throw new HttpError(errorMessage(json, response), response.status, json);
  }
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body,
    json,
  };
}

function encodeValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/**
 * Builds a query string (no leading `?`). Skips `undefined` and `null`,
 * repeats the key for an array, writes a `Date` as its ISO string and
 * JSON-encodes any other object.
 */
function queryParameters(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined || item === null) continue;
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(encodeValue(item))}`,
      );
    }
  }
  return parts.join("&");
}

export const fetchUtils = { fetchJson, queryParameters };
