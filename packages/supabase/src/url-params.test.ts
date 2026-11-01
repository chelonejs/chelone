import { describe, expect, it } from "vitest";
import { readSupabaseUrlParams } from "./url-params";

describe("readSupabaseUrlParams", () => {
  it("reads the tokens and type from the search", () => {
    expect(
      readSupabaseUrlParams({
        search: "?access_token=at&refresh_token=rt&type=recovery",
        hash: "",
      }),
    ).toEqual({ accessToken: "at", refreshToken: "rt", type: "recovery" });
  });

  it("reads them from the hash, and from the query inside a hash route", () => {
    const expected = { accessToken: "at", refreshToken: "rt", type: "invite" };

    expect(
      readSupabaseUrlParams({
        search: "",
        hash: "#access_token=at&refresh_token=rt&type=invite",
      }),
    ).toEqual(expected);
    expect(
      readSupabaseUrlParams({
        search: "",
        hash: "#/auth-callback?access_token=at&refresh_token=rt&type=invite",
      }),
    ).toEqual(expected);
  });

  it("returns null for a key that is missing", () => {
    expect(
      readSupabaseUrlParams({ search: "?type=recovery", hash: "" }),
    ).toEqual({ accessToken: null, refreshToken: null, type: "recovery" });
    expect(readSupabaseUrlParams({ search: "", hash: "" })).toEqual({
      accessToken: null,
      refreshToken: null,
      type: null,
    });
  });
});
