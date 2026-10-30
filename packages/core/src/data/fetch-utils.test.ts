import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUtils } from "./fetch-utils";
import { HttpError } from "./http-error";

const { fetchJson, queryParameters } = fetchUtils;

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) => {
      if (response instanceof Error) throw response;
      return response.clone();
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentHeaders(fetchMock: ReturnType<typeof stubFetch>): Headers {
  return new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchJson", () => {
  it("fetchJson resolves status, headers, body text and parsed json on a 2xx", async () => {
    const fetchMock = stubFetch(
      new Response('{"id":1,"title":"Hello"}', {
        status: 201,
        statusText: "Created",
        headers: { "X-Total-Count": "42" },
      }),
    );

    const result = await fetchJson("https://api.test/posts");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/posts");
    expect(result.status).toBe(201);
    expect(result.statusText).toBe("Created");
    expect(result.headers.get("X-Total-Count")).toBe("42");
    expect(result.body).toBe('{"id":1,"title":"Hello"}');
    expect(result.json).toEqual({ id: 1, title: "Hello" });
  });

  it("fetchJson leaves json undefined for a 2xx body that is not JSON", async () => {
    stubFetch(new Response("plain text", { status: 200 }));

    const result = await fetchJson("https://api.test/ping");

    expect(result.body).toBe("plain text");
    expect(result.json).toBeUndefined();
  });

  it("fetchJson rejects a non-2xx with HttpError, status 400 401 404 500, message from json.message else statusText, body the parsed json", async () => {
    const cases = [
      {
        status: 400,
        statusText: "Bad Request",
        text: '{"message":"Bad title"}',
        message: "Bad title",
        body: { message: "Bad title" },
      },
      {
        status: 401,
        statusText: "Unauthorized",
        text: '{"message":42}',
        message: "Unauthorized",
        body: { message: 42 },
      },
      {
        status: 404,
        statusText: "Not Found",
        text: "<html>gone</html>",
        message: "Not Found",
        body: undefined,
      },
      {
        status: 500,
        statusText: "Internal Server Error",
        text: "",
        message: "Internal Server Error",
        body: undefined,
      },
    ];

    for (const { status, statusText, text, message, body } of cases) {
      stubFetch(new Response(text, { status, statusText }));

      const rejection = fetchJson("https://api.test/posts");

      await expect(rejection).rejects.toBeInstanceOf(HttpError);
      await expect(rejection).rejects.toMatchObject({ status, message });
      await expect(rejection).rejects.toHaveProperty("body", body);
    }
  });

  it("fetchJson falls back to a status message when the statusText is empty", async () => {
    stubFetch(new Response("", { status: 503, statusText: "" }));

    await expect(fetchJson("https://api.test/posts")).rejects.toMatchObject({
      status: 503,
      message: "HTTP 503",
    });
  });

  it("fetchJson rejects with the fetch error itself on a network failure", async () => {
    const networkError = new TypeError("Failed to fetch");
    stubFetch(networkError);

    await expect(fetchJson("https://api.test/posts")).rejects.toBe(
      networkError,
    );
  });

  it("fetchJson sets Accept, sets Content-Type only for a string body without one, and never for FormData", async () => {
    const fetchMock = stubFetch(new Response("{}"));

    await fetchJson("https://api.test/posts");
    expect(sentHeaders(fetchMock).get("Accept")).toBe("application/json");
    expect(sentHeaders(fetchMock).has("Content-Type")).toBe(false);

    await fetchJson("https://api.test/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Hi" }),
    });
    expect(sentHeaders(fetchMock).get("Accept")).toBe("application/json");
    expect(sentHeaders(fetchMock).get("Content-Type")).toBe("application/json");

    await fetchJson("https://api.test/posts", {
      method: "POST",
      body: "title=Hi",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(sentHeaders(fetchMock).get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );

    await fetchJson("https://api.test/posts", {
      method: "POST",
      body: new FormData(),
    });
    expect(sentHeaders(fetchMock).get("Accept")).toBe("application/json");
    expect(sentHeaders(fetchMock).has("Content-Type")).toBe(false);
  });

  it("fetchJson sends Authorization Bearer only when a token is given", async () => {
    const fetchMock = stubFetch(new Response("{}"));

    await fetchJson("https://api.test/posts", { token: "abc123" });
    expect(sentHeaders(fetchMock).get("Authorization")).toBe("Bearer abc123");

    await fetchJson("https://api.test/posts");
    expect(sentHeaders(fetchMock).has("Authorization")).toBe(false);

    await fetchJson("https://api.test/posts", { token: "" });
    expect(sentHeaders(fetchMock).has("Authorization")).toBe(false);

    await fetchJson("https://api.test/posts", {
      token: "abc123",
      headers: { Authorization: "Basic xyz" },
    });
    expect(sentHeaders(fetchMock).get("Authorization")).toBe("Bearer abc123");

    await fetchJson("https://api.test/posts", {
      headers: { Authorization: "Basic xyz" },
    });
    expect(sentHeaders(fetchMock).get("Authorization")).toBe("Basic xyz");
  });

  it("fetchJson passes the AbortSignal through to fetch", async () => {
    const fetchMock = stubFetch(new Response("{}"));
    const controller = new AbortController();

    await fetchJson("https://api.test/posts", { signal: controller.signal });

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});

describe("queryParameters", () => {
  it("queryParameters skips undefined and null, repeats array keys, JSON-encodes objects and percent-encodes reserved characters", () => {
    expect(
      queryParameters({
        q: "a&b=c d",
        skipped: undefined,
        nulled: null,
        tag: ["x", "y z"],
        filter: { title: "Hi", ids: [1, 2] },
        page: 2,
        "k&y": "ü",
        flag: false,
      }),
    ).toBe(
      "q=a%26b%3Dc%20d" +
        "&tag=x&tag=y%20z" +
        "&filter=%7B%22title%22%3A%22Hi%22%2C%22ids%22%3A%5B1%2C2%5D%7D" +
        "&page=2" +
        "&k%26y=%C3%BC" +
        "&flag=false",
    );
  });

  it("queryParameters keeps falsy-but-valid values", () => {
    expect(queryParameters({ page: 0, q: "", flag: false })).toBe(
      "page=0&q=&flag=false",
    );
  });

  it("queryParameters skips undefined and null items inside an array", () => {
    expect(queryParameters({ tag: ["x", undefined, null, "y"] })).toBe(
      "tag=x&tag=y",
    );
    expect(queryParameters({ tag: [undefined, null] })).toBe("");
  });

  it("queryParameters JSON-encodes an object as JSON.stringify does, undefined members dropped and null kept", () => {
    expect(queryParameters({ filter: { a: undefined, b: null, c: 1 } })).toBe(
      `filter=${encodeURIComponent('{"b":null,"c":1}')}`,
    );
  });

  it("queryParameters encodes a Date as its bare ISO string, without JSON quotes", () => {
    expect(queryParameters({ since: new Date(0), ids: [new Date(0)] })).toBe(
      `since=${encodeURIComponent("1970-01-01T00:00:00.000Z")}` +
        `&ids=${encodeURIComponent("1970-01-01T00:00:00.000Z")}`,
    );
  });

  it("queryParameters returns an empty string when nothing is left", () => {
    expect(queryParameters({})).toBe("");
    expect(queryParameters({ a: undefined, b: null })).toBe("");
  });
});
