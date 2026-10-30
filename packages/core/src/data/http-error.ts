/**
 * Rejected by `fetchUtils.fetchJson` on a non-2xx response. `status` is what
 * `authProvider.checkError` reads to log a user out on 401/403; `body` is the
 * parsed response body (a provider maps a 422 onto `ValidationError` from it).
 * Framework-free by design.
 */
export class HttpError extends Error {
  override readonly name = "HttpError";
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
