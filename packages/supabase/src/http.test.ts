import { HttpError } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseRequest } from "./http";

const baseUrl = "https://x.supabase.co/rest/v1";

const stubFetch = (response: Response = Response.json([])) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const sentHeaders = (fetchMock: ReturnType<typeof stubFetch>) =>
  new Headers(fetchMock.mock.calls[0]?.[1]?.headers);

const clientWith = (session: { access_token: string } | null) => ({
  auth: { getSession: async () => ({ data: { session } }) },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("supabaseRequest", () => {
  it("a request sends the apikey header and the session token as Authorization", async () => {
    const fetchMock = stubFetch();

    await supabaseRequest(
      {
        baseUrl,
        apiKey: "anon-key",
        client: clientWith({ access_token: "jwt" }),
      },
      "/posts",
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/posts`);
    const headers = sentHeaders(fetchMock);
    expect(headers.get("apikey")).toBe("anon-key");
    expect(headers.get("Authorization")).toBe("Bearer jwt");
  });

  it("a request without a session sends no Authorization header", async () => {
    const withoutSession = stubFetch();
    await supabaseRequest(
      { baseUrl, apiKey: "sb_publishable_abc", client: clientWith(null) },
      "/posts",
    );
    expect(sentHeaders(withoutSession).get("apikey")).toBe(
      "sb_publishable_abc",
    );
    expect(sentHeaders(withoutSession).has("Authorization")).toBe(false);

    const withoutClient = stubFetch();
    await supabaseRequest({ baseUrl, apiKey: "sb_publishable_abc" }, "/posts");
    expect(sentHeaders(withoutClient).has("Authorization")).toBe(false);
  });

  it("a schema sets Accept-Profile on GET", async () => {
    const fetchMock = stubFetch();

    await supabaseRequest(
      { baseUrl, apiKey: "k", schema: "billing" },
      "/posts",
    );

    expect(sentHeaders(fetchMock).get("Accept-Profile")).toBe("billing");
  });

  it("meta headers are merged last and win", async () => {
    const fetchMock = stubFetch();

    await supabaseRequest(
      {
        baseUrl,
        apiKey: "k",
        schema: "billing",
        headers: { "Accept-Profile": "other", "X-Extra": "1" },
      },
      "/posts",
      { headers: { Prefer: "count=exact" } },
    );

    const headers = sentHeaders(fetchMock);
    expect(headers.get("Accept-Profile")).toBe("other");
    expect(headers.get("X-Extra")).toBe("1");
    expect(headers.get("Prefer")).toBe("count=exact");
  });

  it("a PostgREST error rejects with an HttpError that keeps its status and body", async () => {
    const error = { code: "42501", message: "permission denied", hint: null };
    stubFetch(Response.json(error, { status: 403 }));

    const rejection = await supabaseRequest(
      { baseUrl, apiKey: "k" },
      "/posts",
    ).catch((e: unknown) => e);

    expect(rejection).toBeInstanceOf(HttpError);
    expect(rejection).toMatchObject({
      status: 403,
      body: error,
      message: "permission denied",
    });
  });
});
