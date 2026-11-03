import { HttpError } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { restDataProvider } from "./data-provider";

const apiUrl = "https://api.example.com";

const respond = (
  body: unknown,
  {
    status = 200,
    headers = {},
  }: { status?: number; headers?: Record<string, string> } = {},
) => Response.json(body, { status, headers });

const stubFetch = (response: Response) => {
  // A body reads once, so each call gets its own copy.
  const fetchMock = vi.fn().mockImplementation(async () => response.clone());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const lastCall = (fetchMock: ReturnType<typeof stubFetch>) => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return {
    url: new URL(String(url)),
    method: (init?.method ?? "GET") as string,
    headers: new Headers(init?.headers),
    credentials: init?.credentials as RequestCredentials | undefined,
    body: init?.body as string | undefined,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("restDataProvider", () => {
  it("getList sends page, perPage, sort and filters as query parameters", async () => {
    const fetchMock = stubFetch(respond([{ id: 1 }]));

    await restDataProvider({ apiUrl }).getList("posts", {
      pagination: { page: 2, perPage: 10 },
      sort: [
        { field: "a", order: "ASC" },
        { field: "b", order: "DESC" },
      ],
      filter: { status: "draft", tags: ["x", "y"] },
    });

    const { url, method } = lastCall(fetchMock);
    expect(method).toBe("GET");
    expect(url.origin + url.pathname).toBe(`${apiUrl}/posts`);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("perPage")).toBe("10");
    expect(url.searchParams.get("sort")).toBe("a,-b");
    expect(url.searchParams.get("status")).toBe("draft");
    expect(url.searchParams.getAll("tags")).toEqual(["x", "y"]);
  });
  it("getList sends limit and cursor for cursor pagination", async () => {
    const fetchMock = stubFetch(respond([]));
    const provider = restDataProvider({ apiUrl });

    await provider.getList("posts", {
      pagination: { cursor: "abc", limit: 25 },
    });
    let { url } = lastCall(fetchMock);
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("cursor")).toBe("abc");

    await provider.getList("posts", {
      pagination: { cursor: null, limit: 25 },
    });
    ({ url } = lastCall(fetchMock));
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("getList reads a bare array and takes total from X-Total-Count", async () => {
    stubFetch(
      respond([{ id: 1 }, { id: 2 }], { headers: { "X-Total-Count": "42" } }),
    );

    const result = await restDataProvider({ apiUrl }).getList("posts", {});

    expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }], total: 42 });
  });

  it("getList reads data, total and pageInfo from an object body", async () => {
    stubFetch(
      respond(
        { data: [{ id: 1 }], total: 7, pageInfo: { nextCursor: "n" } },
        { headers: { "X-Total-Count": "99" } },
      ),
    );

    const result = await restDataProvider({ apiUrl }).getList("posts", {});

    expect(result).toEqual({
      data: [{ id: 1 }],
      total: 7,
      pageInfo: { nextCursor: "n" },
    });
  });

  it("getList rejects a body it cannot read and names parseList", async () => {
    stubFetch(respond({ items: [] }));

    await expect(
      restDataProvider({ apiUrl }).getList("posts", {}),
    ).rejects.toThrow(/posts.*parseList/);
  });
  it("getOne, create, update and delete call the record path with the right method", async () => {
    const fetchMock = stubFetch(respond({ id: 5, title: "t" }));
    const provider = restDataProvider({ apiUrl: `${apiUrl}//` });

    const one = await provider.getOne("posts", { id: 5 });
    expect(one).toEqual({ data: { id: 5, title: "t" } });
    expect(lastCall(fetchMock).method).toBe("GET");
    expect(lastCall(fetchMock).url.href).toBe(`${apiUrl}/posts/5`);

    await provider.create("posts", { data: { title: "t" } });
    let call = lastCall(fetchMock);
    expect(call.method).toBe("POST");
    expect(call.url.href).toBe(`${apiUrl}/posts`);
    expect(call.body).toBe(JSON.stringify({ title: "t" }));
    expect(call.headers.get("Content-Type")).toBe("application/json");

    await provider.update("posts", { id: "a/b", data: { title: "u" } });
    call = lastCall(fetchMock);
    expect(call.method).toBe("PUT");
    expect(call.url.href).toBe(`${apiUrl}/posts/a%2Fb`);
    expect(call.body).toBe(JSON.stringify({ title: "u" }));

    const deleted = await provider.delete("posts", { id: 5 });
    call = lastCall(fetchMock);
    expect(call.method).toBe("DELETE");
    expect(call.url.href).toBe(`${apiUrl}/posts/5`);
    expect(deleted).toEqual({ data: { id: 5, title: "t" } });
  });

  it("updateMethod PATCH sends PATCH", async () => {
    const fetchMock = stubFetch(respond({ id: 5 }));

    await restDataProvider({ apiUrl, updateMethod: "PATCH" }).update("posts", {
      id: 5,
      data: {},
    });

    expect(lastCall(fetchMock).method).toBe("PATCH");
  });

  it("path, headers, credentials, meta.headers and meta.query reach the request", async () => {
    const fetchMock = stubFetch(respond([]));
    const provider = restDataProvider({
      apiUrl,
      path: (resource) => `v1/${resource}.json`,
      headers: { "X-Tenant": "acme", "X-Both": "provider" },
      credentials: "include",
    });

    await provider.getList("posts", {
      pagination: { page: 1, perPage: 5 },
      meta: { headers: { "X-Both": "call" }, query: { expand: "author" } },
    });

    const call = lastCall(fetchMock);
    expect(call.url.pathname).toBe("/v1/posts.json");
    expect(call.url.searchParams.get("expand")).toBe("author");
    expect(call.url.searchParams.get("page")).toBe("1");
    expect(call.headers.get("X-Tenant")).toBe("acme");
    expect(call.headers.get("X-Both")).toBe("call");
    expect(call.credentials).toBe("include");
  });

  it("meta.query reaches a record request", async () => {
    const fetchMock = stubFetch(respond({ id: 5 }));

    await restDataProvider({ apiUrl }).getOne("posts", {
      id: 5,
      meta: { query: { expand: "author" } },
    });

    expect(lastCall(fetchMock).url.href).toBe(
      `${apiUrl}/posts/5?expand=author`,
    );
  });

  it("a headers function is read on every call", async () => {
    const fetchMock = stubFetch(respond({ id: 1 }));
    let token = "one";
    const provider = restDataProvider({
      apiUrl,
      headers: async () => ({ Authorization: `Bearer ${token}` }),
    });

    await provider.getOne("posts", { id: 1 });
    expect(lastCall(fetchMock).headers.get("Authorization")).toBe("Bearer one");

    token = "two";
    await provider.getOne("posts", { id: 1 });
    expect(lastCall(fetchMock).headers.get("Authorization")).toBe("Bearer two");
  });

  it("delete with an empty body resolves with previousData", async () => {
    stubFetch(new Response(null, { status: 204 }));
    const provider = restDataProvider({ apiUrl });

    expect(
      await provider.delete("posts", {
        id: 5,
        previousData: { id: 5, title: "t" },
      }),
    ).toEqual({ data: { id: 5, title: "t" } });
    expect(await provider.delete("posts", { id: 5 })).toEqual({
      data: { id: 5 },
    });
  });

  it("a non-2xx response rejects with HttpError carrying its status", async () => {
    stubFetch(respond({ message: "nope" }, { status: 403 }));

    const error = await restDataProvider({ apiUrl })
      .getOne("posts", { id: 1 })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(403);
  });

  it("the verbs of a later slice reject naming themselves", async () => {
    await expect(
      restDataProvider({ apiUrl }).getMany("posts", { ids: [1] }),
    ).rejects.toThrow("restDataProvider: getMany arrives in a later slice");
  });
});
