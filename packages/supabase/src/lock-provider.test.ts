import {
  HttpError,
  LockConflictError,
  lockResourceTopic,
  lockTopic,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseDataProvider } from "./data-provider";
import { supabaseLockProvider } from "./lock-provider";

const instanceUrl = "https://x.supabase.co";
const createdAt = "2026-01-01T00:00:00.000Z";

interface Row {
  resource: string;
  record_id: string;
  identity: string;
  created_at: string;
}

/** A `chelone_locks` table behind the PostgREST calls the provider makes. */
const fakeTable = (initial: Row[] = []) => {
  const rows = [...initial];
  const matching = (url: URL) =>
    rows.filter((row) =>
      (["resource", "record_id", "identity"] as const).every((column) => {
        const filter = url.searchParams.get(column);
        return filter === null || filter === `eq.${row[column]}`;
      }),
    );

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      switch (init?.method ?? "GET") {
        case "POST": {
          const body: Pick<Row, "resource" | "record_id" | "identity"> =
            JSON.parse(String(init?.body));
          const taken = rows.some(
            (row) =>
              row.resource === body.resource &&
              row.record_id === body.record_id,
          );
          if (taken) {
            return Response.json(
              { message: "duplicate key value" },
              { status: 409 },
            );
          }
          const row = { ...body, created_at: createdAt };
          rows.push(row);
          return Response.json([row], { status: 201 });
        }
        case "DELETE": {
          const removed = matching(url);
          for (const row of removed) rows.splice(rows.indexOf(row), 1);
          return Response.json(removed);
        }
        default:
          return Response.json(matching(url));
      }
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return { rows, fetchMock };
};

const setup = (
  initial: Row[] = [],
  options: Partial<Parameters<typeof supabaseLockProvider>[0]> = {},
) => {
  const transport = memoryTransport();
  const table = fakeTable(initial);
  const locks = supabaseLockProvider({
    instanceUrl,
    apiKey: "anon-key",
    publisher: transport,
    ...options,
  });
  return { transport, locks, ...table };
};

const row = (identity: string, recordId = "1", resource = "posts"): Row => ({
  resource,
  record_id: recordId,
  identity,
  created_at: createdAt,
});

const ada = { resource: "posts", recordId: "1", identity: "ada", createdAt };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("supabaseLockProvider", () => {
  it("lock inserts a row, announces locked and returns the lock", async () => {
    const { locks, rows, transport, fetchMock } = setup();

    const lock = await locks.lock("posts", { id: 1, identity: "ada" });

    expect(lock).toEqual(ada);
    expect(rows).toEqual([row("ada")]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(new URL(String(url)).pathname).toBe("/rest/v1/chelone_locks");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Prefer")).toBe(
      "return=representation",
    );
    expect(transport.publishedEvents).toEqual([
      { topic: lockTopic("posts", "1"), type: "locked", payload: ada },
      { topic: lockResourceTopic("posts"), type: "locked", payload: ada },
    ]);
  });

  it("a lock by the same identity returns the existing lock and announces nothing", async () => {
    const { locks, transport } = setup([row("ada")]);

    const lock = await locks.lock("posts", { id: 1, identity: "ada" });

    expect(lock).toEqual(ada);
    expect(transport.publishedEvents).toEqual([]);
  });

  it("a lock by another identity throws LockConflictError with the existing lock", async () => {
    const { locks, rows, transport } = setup([row("ada")]);

    const attempt = locks.lock("posts", { id: 1, identity: "grace" });

    await expect(attempt).rejects.toBeInstanceOf(LockConflictError);
    await expect(attempt).rejects.toMatchObject({ existingLock: ada });
    expect(rows).toEqual([row("ada")]);
    expect(transport.publishedEvents).toEqual([]);
  });

  it("retries the insert once when the conflicting row is gone", async () => {
    const { locks, fetchMock, transport } = setup();
    const conflict = () =>
      Response.json({ message: "duplicate key value" }, { status: 409 });
    fetchMock.mockImplementationOnce(async () => conflict());
    fetchMock.mockImplementationOnce(async () => Response.json([]));

    const lock = await locks.lock("posts", { id: 1, identity: "grace" });

    expect(lock).toMatchObject({ identity: "grace" });
    expect(
      fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET"),
    ).toEqual(["POST", "GET", "POST"]);
    expect(transport.publishedEvents).toHaveLength(2);
  });

  it("gives up after the second insert conflicts too", async () => {
    const { locks, fetchMock } = setup();
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "POST"
        ? Response.json({ message: "duplicate key value" }, { status: 409 })
        : Response.json([]),
    );

    await expect(
      locks.lock("posts", { id: 1, identity: "grace" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rethrows an HTTP error other than the 409", async () => {
    const { locks, fetchMock } = setup();
    fetchMock.mockImplementation(async () =>
      Response.json({ message: "permission denied" }, { status: 403 }),
    );

    const attempt = locks.lock("posts", { id: 1, identity: "ada" });

    await expect(attempt).rejects.toBeInstanceOf(HttpError);
    await expect(attempt).rejects.toMatchObject({ status: 403 });
  });

  it("unlock deletes the holder's row and announces unlocked", async () => {
    const { locks, rows, transport, fetchMock } = setup([
      row("ada"),
      row("ada", "2"),
    ]);

    const lock = await locks.unlock("posts", { id: 1, identity: "ada" });

    expect(lock).toEqual(ada);
    expect(rows).toEqual([row("ada", "2")]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("DELETE");
    expect(Object.fromEntries(new URL(String(url)).searchParams)).toEqual({
      resource: "eq.posts",
      record_id: "eq.1",
      identity: "eq.ada",
    });
    expect(transport.publishedEvents.map((e) => [e.topic, e.type])).toEqual([
      [lockTopic("posts", "1"), "unlocked"],
      [lockResourceTopic("posts"), "unlocked"],
    ]);
  });

  it("unlock throws when no lock exists or another identity holds it", async () => {
    const { locks, rows, transport } = setup([row("ada")]);

    const missing = locks.unlock("posts", { id: 7, identity: "ada" });
    await expect(missing).rejects.toThrow(/posts.*7/);
    await expect(missing).rejects.not.toBeInstanceOf(LockConflictError);

    const other = locks.unlock("posts", { id: 1, identity: "grace" });
    await expect(other).rejects.toBeInstanceOf(LockConflictError);
    await expect(other).rejects.toMatchObject({ existingLock: ada });
    expect(rows).toEqual([row("ada")]);
    expect(transport.publishedEvents).toEqual([]);
  });

  it('treats 1 and "1" as the same identity', async () => {
    const { locks, rows } = setup([row("1")]);

    await expect(
      locks.lock("posts", { id: 1, identity: 1 }),
    ).resolves.toMatchObject({ identity: "1" });
    await expect(
      locks.unlock("posts", { id: 1, identity: 1 }),
    ).resolves.toMatchObject({ identity: "1" });
    expect(rows).toEqual([]);
  });

  it("getLock and getLocks read only the asked resource", async () => {
    const { locks } = setup([
      row("ada", "1"),
      row("grace", "2"),
      row("ada", "1", "users"),
    ]);

    await expect(locks.getLock("posts", { id: 2 })).resolves.toMatchObject({
      identity: "grace",
    });
    await expect(locks.getLock("posts", { id: 9 })).resolves.toBeNull();
    const posts = await locks.getLocks("posts");
    expect(posts.map((lock) => [lock.resource, lock.recordId])).toEqual([
      ["posts", "1"],
      ["posts", "2"],
    ]);
    await expect(locks.getLocks("comments")).resolves.toEqual([]);
  });

  it("sends the session token and the schema header as the data provider does", async () => {
    const client = {
      auth: {
        getSession: async () => ({
          data: { session: { access_token: "jwt" } },
        }),
      },
    };
    const { locks, fetchMock } = setup([], {
      client,
      schema: "app",
      table: "locks",
    });

    await locks.lock("posts", { id: 1, identity: "ada" });
    await locks.getLock("posts", { id: 1 });

    const [postUrl, post] = fetchMock.mock.calls[0] ?? [];
    const [getUrl, get] = fetchMock.mock.calls[1] ?? [];
    expect(new URL(String(postUrl)).pathname).toBe("/rest/v1/locks");
    expect(new URL(String(getUrl)).pathname).toBe("/rest/v1/locks");
    const postHeaders = new Headers(post?.headers);
    expect(postHeaders.get("apikey")).toBe("anon-key");
    expect(postHeaders.get("Authorization")).toBe("Bearer jwt");
    expect(postHeaders.get("Content-Profile")).toBe("app");
    const getHeaders = new Headers(get?.headers);
    expect(getHeaders.get("Authorization")).toBe("Bearer jwt");
    expect(getHeaders.get("Accept-Profile")).toBe("app");
  });

  it("a lock taken through realtimeDataProvider reaches a lockTopic subscriber", async () => {
    const transport = memoryTransport();
    fakeTable();
    const provider = realtimeDataProvider(
      supabaseDataProvider({ instanceUrl, apiKey: "anon-key" }),
      transport,
      {
        locks: supabaseLockProvider({
          instanceUrl,
          apiKey: "anon-key",
          publisher: transport,
        }),
      },
    );
    const callback = vi.fn();
    provider.subscribe(lockTopic("posts", "1"), callback);

    await provider.lock("posts", { id: 1, identity: "ada" });

    expect(callback).toHaveBeenCalledWith({
      topic: lockTopic("posts", "1"),
      type: "locked",
      payload: ada,
    });
  });

  it("a hostile resource or id cannot add a filter and the token never reaches the URL", async () => {
    const token = "secret-session-token";
    const client = {
      auth: {
        getSession: async () => ({
          data: { session: { access_token: token } },
        }),
      },
    };
    const { locks, fetchMock } = setup([], { client });
    const resource = "posts&identity=eq.x";
    const id = "1,identity.eq.x";

    await locks.getLock(resource, { id });
    await locks.getLocks(resource);
    await locks.unlock(resource, { id, identity: "ada" }).catch(() => {});
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ message: "denied" }, { status: 403 }),
    );
    const failure = await locks.lock(resource, { id, identity: "ada" }).then(
      () => undefined,
      (error: Error) => error,
    );

    expect(failure).toBeInstanceOf(HttpError);
    expect(JSON.stringify(failure)).not.toContain(token);
    expect(String(failure)).not.toContain(token);
    for (const [input, init] of fetchMock.mock.calls) {
      const url = new URL(String(input));
      expect(String(input)).not.toContain(token);
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        `Bearer ${token}`,
      );
      const keys = [...url.searchParams.keys()];
      expect(
        keys.every((key) =>
          [
            "resource",
            "record_id",
            "identity",
            "order",
            "select",
            "limit",
          ].includes(key),
        ),
      ).toBe(true);
      expect(url.searchParams.getAll("identity").length).toBeLessThanOrEqual(1);
      if (init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          resource,
          record_id: id,
          identity: "ada",
        });
        continue;
      }
      expect(url.searchParams.get("resource")).toBe(`eq.${resource}`);
      if (url.searchParams.has("record_id")) {
        expect(url.searchParams.get("record_id")).toBe(`eq.${id}`);
      }
    }
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = new URL(String(input));
        return url.searchParams.get("identity") === "eq.x";
      }),
    ).toBe(false);
  });
});
