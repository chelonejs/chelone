import { HttpError } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  const fetchMock = vi.fn().mockImplementation(async () => response.clone());
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
    it("create, update, delete, updateMany and deleteMany are not implemented yet", async () => {
      const posts = provider();

      await expect(posts.create("posts", { data: {} })).rejects.toThrow(
        "not implemented",
      );
      await expect(
        posts.update("posts", { id: 1, data: {} }),
      ).rejects.toThrow("not implemented");
      await expect(posts.delete("posts", { id: 1 })).rejects.toThrow(
        "not implemented",
      );
      await expect(
        posts.updateMany("posts", { ids: [1], data: {} }),
      ).rejects.toThrow("not implemented");
      await expect(
        posts.deleteMany("posts", { ids: [1] }),
      ).rejects.toThrow("not implemented");
    });
  });
});
