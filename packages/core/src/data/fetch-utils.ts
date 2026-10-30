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

function errorMessage(json: unknown, fallback: string): string {
  const message =
    json != null && typeof json === "object"
      ? (json as { message?: unknown }).message
      : undefined;
  return typeof message === "string" ? message : fallback;
}

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
  if (token !== undefined) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  const body = await response.text();
  const json = parseJson(body);
  if (!response.ok) {
    throw new HttpError(
      errorMessage(json, response.statusText),
      response.status,
      json,
    );
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
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/**
 * Builds a query string (no leading `?`). Skips `undefined` and `null`,
 * repeats the key for an array, JSON-encodes a plain object.
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
