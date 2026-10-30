import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUtils } from "./fetch-utils";
import { HttpError } from "./http-error";

const { fetchJson, queryParameters } = fetchUtils;

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    return response.clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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
      },
      { status: 401, statusText: "Unauthorized", text: '{"message":42}' },
      { status: 404, statusText: "Not Found", text: "<html>gone</html>" },
      { status: 500, statusText: "Internal Server Error", text: "" },
    ];
    const expected = [
      { message: "Bad title", body: { message: "Bad title" } },
      { message: "Unauthorized", body: { message: 42 } },
      { message: "Not Found", body: undefined },
      { message: "Internal Server Error", body: undefined },
    ];

    for (const [i, c] of cases.entries()) {
      stubFetch(
        new Response(c.text, { status: c.status, statusText: c.statusText }),
      );
      const error = await fetchJson("https://api.test/posts").catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(HttpError);
      const httpError = error as HttpError;
      expect(httpError.status).toBe(c.status);
      expect(httpError.message).toBe(expected[i]?.message);
      expect(httpError.body).toEqual(expected[i]?.body);
    }
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
    const sent = () => new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers);

    await fetchJson("https://api.test/posts");
    expect(sent().get("Accept")).toBe("application/json");
    expect(sent().has("Content-Type")).toBe(false);

    await fetchJson("https://api.test/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Hi" }),
    });
    expect(sent().get("Content-Type")).toBe("application/json");

    await fetchJson("https://api.test/posts", {
      method: "POST",
      body: "title=Hi",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(sent().get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );

    await fetchJson("https://api.test/posts", {
      method: "POST",
      body: new FormData(),
    });
    expect(sent().has("Content-Type")).toBe(false);
  });

  it("fetchJson sends Authorization Bearer only when a token is given", async () => {
    const fetchMock = stubFetch(new Response("{}"));
    const sent = () => new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers);

    await fetchJson("https://api.test/posts", { token: "abc123" });
    expect(sent().get("Authorization")).toBe("Bearer abc123");

    await fetchJson("https://api.test/posts");
    expect(sent().has("Authorization")).toBe(false);
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

  it("queryParameters returns an empty string when nothing is left", () => {
    expect(queryParameters({})).toBe("");
    expect(queryParameters({ a: undefined, b: null })).toBe("");
  });
});
