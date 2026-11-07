import { HttpError, ValidationError } from "@chelone/core";
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
  const fetchMock = vi
    .fn<(url: string, init: RequestInit) => Promise<Response>>()
    .mockImplementation(async () => response.clone());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const lastCall = (fetchMock: ReturnType<typeof stubFetch>) => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return {
    url: new URL(String(url)),
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
    credentials: init?.credentials,
    body: typeof init?.body === "string" ? init.body : undefined,
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

  it("a meta with a non-record query throws naming query", async () => {
    const fetchMock = stubFetch(respond([]));
    const call = restDataProvider({ apiUrl }).getList("posts", {
      meta: { query: "expand=author" },
    });

    await expect(call).rejects.toThrow(TypeError);
    await expect(call).rejects.toThrow(/meta\.query/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a meta with a non-string header value throws naming headers", async () => {
    const fetchMock = stubFetch(respond({ id: 5 }));
    const call = restDataProvider({ apiUrl }).getOne("posts", {
      id: 5,
      meta: { headers: { Authorization: 1 } },
    });

    await expect(call).rejects.toThrow(TypeError);
    await expect(call).rejects.toThrow(/meta\.headers/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a null meta is an empty meta, and a key the provider does not know is ignored", async () => {
    const fetchMock = stubFetch(respond({ id: 5 }));
    const provider = restDataProvider({ apiUrl });

    await provider.getOne("posts", { id: 5, meta: null });
    await provider.getOne("posts", { id: 5, meta: { tenant: "acme" } });

    expect(lastCall(fetchMock).url.search).toBe("");
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
    if (!(error instanceof HttpError)) throw error;
    expect(error.status).toBe(403);
  });

  it("getMany sends every id in one request", async () => {
    const fetchMock = stubFetch(respond([{ id: 1 }, { id: 2 }]));

    const result = await restDataProvider({ apiUrl }).getMany("posts", {
      ids: [1, 2],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe("GET");
    expect(url.origin + url.pathname).toBe(`${apiUrl}/posts`);
    expect(url.searchParams.getAll("id")).toEqual(["1", "2"]);
    expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }] });
  });
  it("getMany with no ids resolves empty without a request", async () => {
    const fetchMock = stubFetch(respond([{ id: 1 }]));

    const result = await restDataProvider({ apiUrl }).getMany("posts", {
      ids: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [] });
  });

  it("getMany with batchGetMany false calls getOne per id", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) =>
        respond({ id: Number(url.split("/").at(-1)) }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await restDataProvider({
      apiUrl,
      batchGetMany: false,
    }).getMany("posts", { ids: [1, 2] });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${apiUrl}/posts/1`,
      `${apiUrl}/posts/2`,
    ]);
    expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }] });
  });

  it("getManyQuery changes the getMany parameters", async () => {
    const fetchMock = stubFetch(respond([{ id: 1 }]));

    await restDataProvider({
      apiUrl,
      getManyQuery: (ids) => ({ filter: `id:in:${ids.join("|")}` }),
    }).getMany("posts", { ids: [1, 2] });

    const { url } = lastCall(fetchMock);
    expect(url.searchParams.get("filter")).toBe("id:in:1|2");
    expect(url.searchParams.has("id")).toBe(false);
  });

  it("getManyReference filters the list by target", async () => {
    const fetchMock = stubFetch(
      respond([{ id: 1 }], { headers: { "X-Total-Count": "7" } }),
    );

    const result = await restDataProvider({ apiUrl }).getManyReference(
      "comments",
      {
        target: "postId",
        id: 5,
        pagination: { page: 2, perPage: 10 },
        sort: { field: "createdAt", order: "DESC" },
        filter: { status: "approved" },
      },
    );

    const { url } = lastCall(fetchMock);
    expect(url.origin + url.pathname).toBe(`${apiUrl}/comments`);
    expect(url.searchParams.get("postId")).toBe("5");
    expect(url.searchParams.get("status")).toBe("approved");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("perPage")).toBe("10");
    expect(url.searchParams.get("sort")).toBe("-createdAt");
    expect(result).toEqual({ data: [{ id: 1 }], total: 7 });
  });

  it("updateMany and deleteMany call each id and resolve with the ids", async () => {
    const fetchMock = stubFetch(respond({ id: 1 }));
    const provider = restDataProvider({ apiUrl });

    const updated = await provider.updateMany("posts", {
      ids: [1, 2],
      data: { status: "published" },
    });
    expect(updated).toEqual({ data: [1, 2] });
    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.body]),
    ).toEqual([
      [`${apiUrl}/posts/1`, "PUT", '{"status":"published"}'],
      [`${apiUrl}/posts/2`, "PUT", '{"status":"published"}'],
    ]);

    fetchMock.mockClear();
    const deleted = await provider.deleteMany("posts", { ids: [1, 2] });
    expect(deleted).toEqual({ data: [1, 2] });
    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init.method]),
    ).toEqual([
      [`${apiUrl}/posts/1`, "DELETE"],
      [`${apiUrl}/posts/2`, "DELETE"],
    ]);
  });

  it("updateMany rejects when one call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          url.endsWith("/2")
            ? respond({ message: "nope" }, { status: 500 })
            : respond({ id: 1 }),
        ),
    );

    const error = await restDataProvider({ apiUrl })
      .updateMany("posts", { ids: [1, 2], data: { status: "published" } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    if (!(error instanceof HttpError)) throw error;
    expect(error.status).toBe(500);
  });

  it("update with an empty body resolves with the sent data merged over previousData", async () => {
    stubFetch(new Response(null, { status: 204 }));

    const result = await restDataProvider({ apiUrl }).update("posts", {
      id: 5,
      data: { title: "new" },
      previousData: { id: 5, title: "old", body: "b" },
    });

    expect(result).toEqual({ data: { id: 5, title: "new", body: "b" } });
  });

  it("create, getOne and update reject a body that is not a JSON object and name parseRecord", async () => {
    stubFetch(new Response("OK", { status: 200 }));
    const provider = restDataProvider({ apiUrl });

    await expect(
      provider.create("posts", { data: { title: "t" } }),
    ).rejects.toThrow(/posts.*parseRecord/);
    await expect(provider.getOne("posts", { id: 1 })).rejects.toThrow(
      /posts.*parseRecord/,
    );
    await expect(
      provider.update("posts", { id: 1, data: { title: "t" } }),
    ).rejects.toThrow(/posts.*parseRecord/);
  });

  it("delete resolves with previousData when the body is not a record with an id", async () => {
    const previousData = { id: 5, title: "t" };
    const provider = restDataProvider({ apiUrl });

    for (const reply of [
      respond({}),
      respond({ success: true }),
      new Response("OK", { status: 200 }),
    ]) {
      stubFetch(reply);
      expect(await provider.delete("posts", { id: 5, previousData })).toEqual({
        data: previousData,
      });
    }
  });

  it("getList rejects a filter that collides with a pagination or sort parameter and names listQuery", async () => {
    const fetchMock = stubFetch(respond([]));

    await expect(
      restDataProvider({ apiUrl }).getList("posts", {
        pagination: { page: 1, perPage: 5 },
        filter: { perPage: 99 },
      }),
    ).rejects.toThrow(/perPage.*listQuery/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getList ignores an empty X-Total-Count header", async () => {
    stubFetch(respond([{ id: 1 }], { headers: { "X-Total-Count": "" } }));

    const result = await restDataProvider({ apiUrl }).getList("posts", {});

    expect(result).toEqual({ data: [{ id: 1 }] });
  });

  it("a 422 with field errors rejects create with ValidationError", async () => {
    stubFetch(
      respond(
        {
          message: "Invalid",
          errors: { title: "is required", tags: ["too short", "too long"] },
        },
        { status: 422 },
      ),
    );

    const error = await restDataProvider({ apiUrl })
      .create("posts", { data: {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    if (!(error instanceof ValidationError)) throw error;
    expect(error.message).toBe("Invalid");
    expect(error.fieldErrors).toEqual({
      title: "is required",
      tags: ["too short", "too long"],
    });
  });

  it("a 422 with field errors rejects update and updateMany with ValidationError", async () => {
    stubFetch(respond({ errors: { title: "is required" } }, { status: 422 }));
    const provider = restDataProvider({ apiUrl });

    const updated = await provider
      .update("posts", { id: 1, data: {} })
      .catch((e: unknown) => e);
    const updatedMany = await provider
      .updateMany("posts", { ids: [1, 2], data: {} })
      .catch((e: unknown) => e);

    for (const error of [updated, updatedMany]) {
      expect(error).toBeInstanceOf(ValidationError);
      if (!(error instanceof ValidationError)) throw error;
      expect(error.fieldErrors).toEqual({
        title: "is required",
      });
    }
  });

  it("a 422 with no errors object stays an HttpError", async () => {
    const provider = restDataProvider({ apiUrl });

    for (const body of [
      { message: "Unprocessable" },
      { errors: "bad" },
      { errors: { title: 5 } },
      { message: "Title taken", errors: {} },
      { message: "Title taken", errors: { title: [] } },
      { message: "Title taken", errors: { title: "" } },
    ]) {
      stubFetch(respond(body, { status: 422 }));
      const error = await provider
        .create("posts", { data: {} })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      if (!(error instanceof HttpError)) throw error;
      expect(error.status).toBe(422);
    }
  });

  it("a 401 stays an HttpError with its status", async () => {
    stubFetch(respond({ errors: { title: "is required" } }, { status: 401 }));

    const error = await restDataProvider({ apiUrl })
      .create("posts", { data: {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).not.toBeInstanceOf(ValidationError);
    if (!(error instanceof HttpError)) throw error;
    expect(error.status).toBe(401);
  });

  it("a 422 from a read stays an HttpError", async () => {
    stubFetch(respond({ errors: { title: "is required" } }, { status: 422 }));

    const error = await restDataProvider({ apiUrl })
      .getOne("posts", { id: 1 })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
  });

  it("toError replaces the mapping", async () => {
    class ApiError extends Error {}
    const toError = vi.fn(
      (error: HttpError) => new ApiError(`api ${error.status}`),
    );
    const provider = restDataProvider({ apiUrl, toError });

    stubFetch(respond({ errors: { title: "is required" } }, { status: 422 }));
    const created = await provider
      .create("posts", { data: {} })
      .catch((e: unknown) => e);
    stubFetch(respond({ message: "nope" }, { status: 500 }));
    const read = await provider
      .getOne("posts", { id: 1 })
      .catch((e: unknown) => e);

    expect(created).toBeInstanceOf(ApiError);
    expect(created).not.toBeInstanceOf(ValidationError);
    if (!(created instanceof ApiError)) throw created;
    expect(created.message).toBe("api 422");
    expect(read).toBeInstanceOf(ApiError);
    if (!(read instanceof ApiError)) throw read;
    expect(read.message).toBe("api 500");
  });
});
