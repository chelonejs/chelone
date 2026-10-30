import { describe, expect, it } from "vitest";
import { checkError } from "../auth/auth-options";
import type { AuthProvider } from "../auth/types";
import { HttpError } from "./http-error";

describe("HttpError", () => {
  it("HttpError is an Error named HttpError that carries message, status and body", () => {
    const body = { message: "Nope", errors: { title: "Required" } };
    const err = new HttpError("Nope", 422, body);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("HttpError");
    expect(err.message).toBe("Nope");
    expect(err.status).toBe(422);
    expect(err.body).toBe(body);
  });

  it("HttpError body is optional", () => {
    const err = new HttpError("Not Found", 404);
    expect(err.status).toBe(404);
    expect(err.body).toBeUndefined();
  });

  it("core checkError hands the same HttpError to authProvider.checkError, a 401 rejects into logout and a 500 resolves", async () => {
    const seen: unknown[] = [];
    const authProvider = {
      checkError: async (error: unknown) => {
        seen.push(error);
        if (error instanceof HttpError && [401, 403].includes(error.status)) {
          throw new Error("session expired");
        }
      },
    } as unknown as AuthProvider;

    const unauthorized = new HttpError("Unauthorized", 401);
    const failed = new HttpError("Internal Server Error", 500);

    expect((await checkError(authProvider, unauthorized)).logout).toBe(true);
    expect((await checkError(authProvider, failed)).logout).toBe(false);
    expect(seen).toEqual([unauthorized, failed]);
    expect(seen[0]).toBe(unauthorized);
  });
});
