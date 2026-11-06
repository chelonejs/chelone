import { HttpError } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { testClient } from "./__fixtures__/test-client";
import { supabaseAuthProvider } from "./auth-provider";
import { supabaseDataProvider } from "./data-provider";

const instanceUrl = "https://x.supabase.co";

const respond = (
  body: unknown,
  { status = 200, range }: { status?: number; range?: string } = {},
) =>
  Response.json(body, {
    status,
    headers: range === undefined ? {} : { "Content-Range": range },
  });

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
    headers: new Headers(init?.headers),
  };
};

const provider = (
  options: Partial<Parameters<typeof supabaseDataProvider>[0]> = {},
) => supabaseDataProvider({ instanceUrl, apiKey: "anon-key", ...options });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("supabaseDataProvider", () => {
  describe("getList", () => {
    it("getList sends offset, limit, order and filters and returns data with the total from Content-Range", async () => {
      const fetchMock = stubFetch(
        respond([{ id: 1, title: "a" }], { range: "10-19/42" }),
      );

      const result = await provider().getList("posts", {
        pagination: { page: 2, perPage: 10 },
        sort: { field: "title", order: "DESC" },
        filter: { status: "draft", "views@gt": 5 },
      });

      expect(result).toEqual({ data: [{ id: 1, title: "a" }], total: 42 });
      const { url } = lastCall(fetchMock);
      expect(url.origin + url.pathname).toBe(`${instanceUrl}/rest/v1/posts`);
      expect(url.searchParams.get("offset")).toBe("10");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("order")).toBe("title.desc.nullsfirst");
      expect(url.searchParams.get("status")).toBe("eq.draft");
      expect(url.searchParams.get("views")).toBe("gt.5");
    });

    it("getList sends Prefer count=exact", async () => {
      const fetchMock = stubFetch(respond([], { range: "*/0" }));

      await provider().getList("posts", {});

      expect(lastCall(fetchMock).headers.get("Prefer")).toBe("count=exact");
    });

    it("getList returns an undefined total for a Content-Range ending in *", async () => {
      stubFetch(respond([{ id: 1 }], { range: "0-0/*" }));

      const result = await provider().getList("posts", {});

      expect(result.total).toBeUndefined();
      expect(result.data).toEqual([{ id: 1 }]);
    });

    it("getList throws the CORS hint when Content-Range is missing", async () => {
      stubFetch(respond([]));

      await expect(provider().getList("posts", {})).rejects.toThrow(
        /Access-Control-Expose-Headers/,
      );
    });

    it("getList rejects cursor pagination", async () => {
      const fetchMock = stubFetch(respond([], { range: "*/0" }));

      await expect(
        provider().getList("posts", {
          pagination: { cursor: null, limit: 10 },
        }),
      ).rejects.toThrow(
        "supabaseDataProvider does not support cursor pagination",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("getList without pagination sends no offset or limit", async () => {
      const fetchMock = stubFetch(respond([], { range: "*/0" }));

      await provider().getList("posts", {});

      const { url } = lastCall(fetchMock);
      expect(url.searchParams.has("offset")).toBe(false);
      expect(url.searchParams.has("limit")).toBe(false);
    });

    it("getList sends meta.columns and meta.embed as select", async () => {
      const fetchMock = stubFetch(respond([], { range: "*/0" }));

      await provider().getList("posts", {
        meta: { columns: ["id", "title"], embed: ["author"] },
      });

      expect(lastCall(fetchMock).url.searchParams.get("select")).toBe(
        "id,title,author(*)",
      );
    });

    it("getList uses meta.schema over the schema option", async () => {
      const fetchMock = stubFetch(respond([], { range: "*/0" }));
      const posts = provider({ schema: () => "public" });

      await posts.getList("posts", {});
      expect(lastCall(fetchMock).headers.get("Accept-Profile")).toBe("public");

      await posts.getList("posts", { meta: { schema: "billing" } });
      expect(lastCall(fetchMock).headers.get("Accept-Profile")).toBe("billing");
    });

    it("getList adds a JSON id to records of a compound-key resource", async () => {
      stubFetch(respond([{ post_id: 1, tag_id: 2 }], { range: "0-0/1" }));

      const result = await provider({
        primaryKeys: { post_tags: ["post_id", "tag_id"] },
      }).getList("post_tags", {});

      expect(result.data).toEqual([{ post_id: 1, tag_id: 2, id: "[1,2]" }]);
    });

    it("getList sends the session token as Authorization", async () => {
      const fetchMock = stubFetch(respond([], { range: "*/0" }));

      await provider({
        client: {
          auth: {
            getSession: async () => ({
              data: { session: { access_token: "jwt" } },
            }),
          },
        },
      }).getList("posts", {});

      const { headers } = lastCall(fetchMock);
      expect(headers.get("apikey")).toBe("anon-key");
      expect(headers.get("Authorization")).toBe("Bearer jwt");
    });
  });

  describe("getOne", () => {
    it("getOne asks for a single object and returns it", async () => {
      const fetchMock = stubFetch(respond({ id: 7, title: "a" }));

      const result = await provider().getOne("posts", { id: 7 });

      expect(result).toEqual({ data: { id: 7, title: "a" } });
      const { url, headers } = lastCall(fetchMock);
      expect(url.searchParams.get("id")).toBe("eq.7");
      expect(headers.get("Accept")).toBe("application/vnd.pgrst.object+json");
    });

    it("getOne turns a 406 into an HttpError with status 404", async () => {
      stubFetch(
        respond(
          {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
          },
          { status: 406 },
        ),
      );

      const rejection = await provider()
        .getOne("posts", { id: 7 })
        .catch((e: unknown) => e);

      expect(rejection).toBeInstanceOf(HttpError);
      expect(rejection).toMatchObject({ status: 404 });
    });

    it("getOne decodes a compound id into one filter per key column", async () => {
      const fetchMock = stubFetch(respond({ post_id: 1, tag_id: 2 }));

      const result = await provider({
        primaryKeys: { post_tags: ["post_id", "tag_id"] },
      }).getOne("post_tags", { id: "[1,2]" });

      const { url } = lastCall(fetchMock);
      expect(url.searchParams.get("post_id")).toBe("eq.1");
      expect(url.searchParams.get("tag_id")).toBe("eq.2");
      expect(result.data).toEqual({ post_id: 1, tag_id: 2, id: "[1,2]" });
    });
  });

  describe("getMany", () => {
    it("getMany requests the ids with in and makes no request for no ids", async () => {
      const fetchMock = stubFetch(respond([{ id: 1 }, { id: 2 }]));
      const posts = provider();

      const result = await posts.getMany("posts", { ids: [1, 2] });

      expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }] });
      expect(lastCall(fetchMock).url.searchParams.get("id")).toBe("in.(1,2)");

      fetchMock.mockClear();
      await expect(posts.getMany("posts", { ids: [] })).resolves.toEqual({
        data: [],
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("getManyReference", () => {
    it("getManyReference filters the target column merged with the filter and returns the total", async () => {
      const fetchMock = stubFetch(respond([{ id: 3 }], { range: "0-0/1" }));

      const result = await provider().getManyReference("comments", {
        target: "post_id",
        id: 7,
        filter: { approved: true },
        pagination: { page: 1, perPage: 5 },
        sort: { field: "id", order: "ASC" },
      });

      expect(result).toEqual({ data: [{ id: 3 }], total: 1 });
      const { url } = lastCall(fetchMock);
      expect(url.searchParams.get("post_id")).toBe("eq.7");
      expect(url.searchParams.get("approved")).toBe("eq.true");
      expect(url.searchParams.get("offset")).toBe("0");
      expect(url.searchParams.get("limit")).toBe("5");
      expect(url.searchParams.get("order")).toBe("id.asc.nullslast");
    });
  });

  describe("writes", () => {
    const sentBody = (fetchMock: ReturnType<typeof stubFetch>) =>
      JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
    const sentMethod = (fetchMock: ReturnType<typeof stubFetch>) =>
      fetchMock.mock.calls.at(-1)?.[1]?.method;
    const compound = { primaryKeys: { post_tags: ["post_id", "tag_id"] } };

    it("create POSTs the data and returns the representation", async () => {
      const fetchMock = stubFetch(
        respond({ id: 9, title: "a" }, { status: 201 }),
      );

      const result = await provider().create("posts", {
        data: { title: "a" },
      });

      expect(result).toEqual({ data: { id: 9, title: "a" } });
      expect(sentMethod(fetchMock)).toBe("POST");
      expect(sentBody(fetchMock)).toEqual({ title: "a" });
      const { url, headers } = lastCall(fetchMock);
      expect(url.origin + url.pathname).toBe(`${instanceUrl}/rest/v1/posts`);
      expect(headers.get("Prefer")).toBe("return=representation");
      expect(headers.get("Accept")).toBe("application/vnd.pgrst.object+json");
    });

    it("create strips the virtual id of a compound-key resource and sets it on the result", async () => {
      const fetchMock = stubFetch(
        respond({ post_id: 1, tag_id: 2 }, { status: 201 }),
      );

      const result = await provider(compound).create("post_tags", {
        data: { post_id: 1, tag_id: 2, id: "[1,2]" },
      });

      expect(sentBody(fetchMock)).toEqual({ post_id: 1, tag_id: 2 });
      expect(result.data).toEqual({ post_id: 1, tag_id: 2, id: "[1,2]" });
    });

    it("a write sends Content-Profile for a schema", async () => {
      const fetchMock = stubFetch(respond({ id: 1 }));
      const posts = provider({ schema: "public" });

      await posts.create("posts", { data: {} });
      expect(lastCall(fetchMock).headers.get("Content-Profile")).toBe("public");
      expect(lastCall(fetchMock).headers.has("Accept-Profile")).toBe(false);

      await posts.update("posts", {
        id: 1,
        data: {},
        previousData: { id: 1 },
        meta: { schema: "billing" },
      });
      expect(lastCall(fetchMock).headers.get("Content-Profile")).toBe(
        "billing",
      );

      await posts.delete("posts", { id: 1, meta: { schema: "billing" } });
      expect(lastCall(fetchMock).headers.get("Content-Profile")).toBe(
        "billing",
      );
    });

    it("update PATCHes the id filter without the primary key in the body and returns the row", async () => {
      const fetchMock = stubFetch(respond({ id: 7, title: "b" }));

      const result = await provider().update("posts", {
        id: 7,
        data: { id: 7, title: "b" },
        previousData: { id: 7, title: "a" },
      });

      expect(result).toEqual({ data: { id: 7, title: "b" } });
      expect(sentMethod(fetchMock)).toBe("PATCH");
      expect(sentBody(fetchMock)).toEqual({ title: "b" });
      const { url, headers } = lastCall(fetchMock);
      expect(url.searchParams.get("id")).toBe("eq.7");
      expect(headers.get("Prefer")).toBe("return=representation");
      expect(headers.get("Accept")).toBe("application/vnd.pgrst.object+json");
    });

    it("update of a missing row rejects with an HttpError with status 404", async () => {
      stubFetch(respond({ code: "PGRST116" }, { status: 406 }));

      const rejection = await provider()
        .update("posts", { id: 7, data: {}, previousData: { id: 7 } })
        .catch((e: unknown) => e);

      expect(rejection).toBeInstanceOf(HttpError);
      expect(rejection).toMatchObject({ status: 404 });
    });

    it("delete of a missing row rejects with an HttpError with status 404", async () => {
      stubFetch(respond({ code: "PGRST116" }, { status: 406 }));

      const rejection = await provider()
        .delete("posts", { id: 7 })
        .catch((e: unknown) => e);

      expect(rejection).toBeInstanceOf(HttpError);
      expect(rejection).toMatchObject({ status: 404 });
    });

    it("updateMany PATCHes the in filter and returns the ids", async () => {
      const fetchMock = stubFetch(respond([{ id: 1 }, { id: 2 }]));

      const result = await provider().updateMany("posts", {
        ids: [1, 2, 3],
        data: { status: "done" },
      });

      expect(result).toEqual({ data: [1, 2] });
      expect(sentMethod(fetchMock)).toBe("PATCH");
      expect(sentBody(fetchMock)).toEqual({ status: "done" });
      const { url, headers } = lastCall(fetchMock);
      expect(url.searchParams.get("id")).toBe("in.(1,2,3)");
      expect(headers.get("Prefer")).toBe("return=representation");
    });

    it("delete DELETEs the id filter and returns the deleted row", async () => {
      const fetchMock = stubFetch(respond({ id: 7, title: "a" }));

      const result = await provider().delete("posts", { id: 7 });

      expect(result).toEqual({ data: { id: 7, title: "a" } });
      expect(sentMethod(fetchMock)).toBe("DELETE");
      const { url, headers } = lastCall(fetchMock);
      expect(url.searchParams.get("id")).toBe("eq.7");
      expect(headers.get("Prefer")).toBe("return=representation");
      expect(headers.get("Accept")).toBe("application/vnd.pgrst.object+json");
    });

    it("deleteMany DELETEs the in filter and returns the ids", async () => {
      const fetchMock = stubFetch(respond([{ id: 1 }, { id: 2 }]));

      const result = await provider().deleteMany("posts", { ids: [1, 2] });

      expect(result).toEqual({ data: [1, 2] });
      expect(sentMethod(fetchMock)).toBe("DELETE");
      expect(lastCall(fetchMock).url.searchParams.get("id")).toBe("in.(1,2)");
    });

    it("updateMany and deleteMany with no ids make no request", async () => {
      const fetchMock = stubFetch(respond([]));
      const posts = provider();

      await expect(
        posts.updateMany("posts", { ids: [], data: { a: 1 } }),
      ).resolves.toEqual({ data: [] });
      await expect(posts.deleteMany("posts", { ids: [] })).resolves.toEqual({
        data: [],
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("a compound key filters on every key column for update and delete", async () => {
      const fetchMock = stubFetch(
        respond({ post_id: 1, tag_id: 2, note: "x" }),
      );
      const postTags = provider(compound);

      const updated = await postTags.update("post_tags", {
        id: "[1,2]",
        data: { id: "[1,2]", post_id: 1, tag_id: 2, note: "x" },
        previousData: { id: "[1,2]" },
      });
      expect(sentBody(fetchMock)).toEqual({ note: "x" });
      expect(lastCall(fetchMock).url.searchParams.get("and")).toBe(
        "(post_id.eq.1,tag_id.eq.2)",
      );
      expect(updated.data).toMatchObject({ id: "[1,2]", note: "x" });

      const deleted = await postTags.delete("post_tags", { id: "[1,2]" });
      expect(lastCall(fetchMock).url.searchParams.get("and")).toBe(
        "(post_id.eq.1,tag_id.eq.2)",
      );
      expect(deleted.data).toMatchObject({ id: "[1,2]" });

      fetchMock.mockImplementation(async () =>
        respond([
          { post_id: 1, tag_id: 2 },
          { post_id: 3, tag_id: 4 },
        ]),
      );
      const many = await postTags.deleteMany("post_tags", {
        ids: ["[1,2]", "[3,4]"],
      });
      expect(lastCall(fetchMock).url.searchParams.get("or")).toBe(
        "(and(post_id.eq.1,tag_id.eq.2),and(post_id.eq.3,tag_id.eq.4))",
      );
      expect(many.data).toEqual(["[1,2]", "[3,4]"]);

      await postTags.updateMany("post_tags", {
        ids: ["[1,2]"],
        data: { note: "y" },
      });
      expect(lastCall(fetchMock).url.searchParams.get("and")).toBe(
        "(post_id.eq.1,tag_id.eq.2)",
      );
    });

    it("a 401 from a write rejects with an HttpError that supabaseAuthProvider.checkError rejects on", async () => {
      stubFetch(
        respond({ message: "JWT expired", code: "PGRST301" }, { status: 401 }),
      );

      const rejection = await provider()
        .create("posts", { data: {} })
        .catch((e: unknown) => e);

      expect(rejection).toBeInstanceOf(HttpError);
      expect(rejection).toMatchObject({ status: 401 });
      const auth = supabaseAuthProvider(testClient());
      await expect(auth.checkError?.(rejection)).rejects.toBe(rejection);
    });
  });
});
