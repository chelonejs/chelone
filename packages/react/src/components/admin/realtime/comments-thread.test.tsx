import {
  type AuthProvider,
  addEventsForMutations,
  createNotificationStore,
  type DataProvider,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { CommentsThread } from "./comments-thread";

afterEach(cleanup);

const comment = (over: Record<string, unknown>) => ({
  id: 1,
  postId: 7,
  authorId: "u1",
  authorName: "Ann Lee",
  body: "First",
  createdAt: "2026-01-02T10:00:00.000Z",
  ...over,
});

type Seed = Record<string, unknown>[];

function setup({
  comments = [],
  authProvider,
  provider,
  contextRecord = { id: 7 },
}: {
  contextRecord?: { id?: number };
  comments?: Seed;
  authProvider?: AuthProvider;
  provider?: DataProvider;
} = {}) {
  const dataProvider =
    provider ?? (fakeDataProvider({ comments } as never) as DataProvider);
  const getList = vi.spyOn(dataProvider, "getList");
  const create = vi.spyOn(dataProvider, "create");
  const update = vi.spyOn(dataProvider, "update");
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      notifications={notifications}
      authProvider={authProvider}
    >
      <RecordContextProvider value={contextRecord}>
        {children}
      </RecordContextProvider>
    </CheloneProvider>
  );
  return { Providers, getList, create, update, notifications, dataProvider };
}

const cards = () =>
  Array.from(document.querySelectorAll('[data-slot="comment"]'));

describe("CommentsThread", () => {
  it("CommentsThread renders one card per comment of the record and none of another record", async () => {
    const { Providers } = setup({
      comments: [
        comment({ id: 1, body: "First" }),
        comment({ id: 2, body: "Second" }),
        comment({ id: 3, postId: 8, body: "Elsewhere" }),
      ],
    });
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });

    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(cards().map((c) => c.getAttribute("data-comment-id"))).toEqual([
      "1",
      "2",
    ]);
    expect(screen.queryByText("Elsewhere")).toBeNull();
  });
  it("CommentsThread shows the author name, falling back to the author id", async () => {
    const { Providers } = setup({
      comments: [
        comment({ id: 1, authorName: "Ann Lee", authorId: "u1" }),
        comment({ id: 2, authorName: undefined, authorId: "u2" }),
      ],
    });
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });

    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(within(cards()[0] as HTMLElement).getByText("Ann Lee")).toBeTruthy();
    expect(within(cards()[1] as HTMLElement).getByText("u2")).toBeTruthy();
  });

  it("CommentsThread asks the provider for the target filter and createdAt ascending", async () => {
    const { Providers, getList } = setup({ comments: [comment({})] });
    render(
      <CommentsThread reference="comments" target="postId" perPage={25} />,
      { wrapper: Providers },
    );

    await waitFor(() => expect(getList).toHaveBeenCalled());
    expect(getList).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        filter: { postId: 7 },
        sort: { field: "createdAt", order: "ASC" },
        pagination: { page: 1, perPage: 25 },
      }),
    );
  });

  it("CommentsThread renders nothing and fetches nothing without a record", async () => {
    const { Providers, getList } = setup({ contextRecord: {} });
    const { container } = render(
      <CommentsThread reference="comments" target="postId" />,
      { wrapper: Providers },
    );
    await act(async () => {});

    expect(container.innerHTML).toBe("");
    expect(getList).not.toHaveBeenCalled();
  });

  it("CommentsThread shows the empty state with no comments", async () => {
    const { Providers } = setup();
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });

    expect(
      await screen.findByText("No comments yet. Be the first."),
    ).toBeTruthy();
  });

  it("CommentsThread omits the time of a comment with an unparsable createdAt", async () => {
    const { Providers } = setup({
      comments: [
        comment({ id: 1, createdAt: "garbage" }),
        comment({ id: 2, createdAt: "2026-01-02T10:00:00.000Z" }),
      ],
    });
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });

    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.queryByText(/Invalid Date/)).toBeNull();
    const byId = (id: string) =>
      document.querySelector(`[data-comment-id="${id}"]`) as HTMLElement;
    expect(byId("1").querySelector("time")).toBeNull();
    expect(byId("2").querySelector("time")).not.toBeNull();
  });
  it("CommentsThread posts a trimmed comment with the target, author and createdAt, then clears the draft", async () => {
    const getIdentity = vi.fn(async () => ({ id: "u9", fullName: "Zed Poe" }));
    const { Providers, create } = setup({
      authProvider: {
        login: async () => {},
        logout: async () => {},
        checkAuth: async () => {},
        checkError: async () => {},
        getIdentity,
      },
    });
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    const box = await screen.findByPlaceholderText("Write a comment…");
    fireEvent.change(box, { target: { value: "  Looks good\n  to me  " } });
    await waitFor(() =>
      expect((screen.getByText("Post") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    const before = Date.now();
    await waitFor(() => expect(getIdentity).toHaveBeenCalled());
    await act(async () => {});
    fireEvent.click(screen.getByText("Post"));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const call = create.mock.calls[0] as [
      string,
      { data: Record<string, unknown> },
    ];
    expect(call[0]).toBe("comments");
    expect(call[1].data).toMatchObject({
      postId: 7,
      authorId: "u9",
      authorName: "Zed Poe",
      body: "Looks good\n  to me",
    });
    const createdAt = Date.parse(String(call[1].data.createdAt));
    expect(createdAt).toBeGreaterThanOrEqual(before);
    expect(createdAt).toBeLessThanOrEqual(Date.now());
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(""));
    expect(await screen.findByText(/Looks good/)).toBeTruthy();
  });

  it("CommentsThread keeps the draft and notifies an error when the create fails", async () => {
    const { Providers, create, notifications } = setup();
    create.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    const box = await screen.findByPlaceholderText("Write a comment…");
    fireEvent.change(box, { target: { value: "Hello" } });
    fireEvent.click(screen.getByText("Post"));

    await waitFor(() =>
      expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
        "chelone.notification.http_error",
      ]),
    );
    expect(notifications.getSnapshot()[0]?.type).toBe("error");
    expect((box as HTMLTextAreaElement).value).toBe("Hello");
  });

  it("CommentsThread disables Post for a blank body and while posting", async () => {
    const { Providers, create } = setup();
    let release: () => void = () => {};
    create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { id: 1 } } as never);
        }),
    );
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    const box = await screen.findByPlaceholderText("Write a comment…");
    const post = screen.getByText("Post") as HTMLButtonElement;
    expect(post.disabled).toBe(true);
    fireEvent.change(box, { target: { value: "   \n " } });
    expect(post.disabled).toBe(true);

    fireEvent.change(box, { target: { value: "Hi" } });
    expect(post.disabled).toBe(false);
    fireEvent.click(post);
    await waitFor(() => expect(post.disabled).toBe(true));
    fireEvent.click(post);
    expect(create).toHaveBeenCalledTimes(1);

    await act(async () => release());
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(""));
  });

  it("CommentsThread posts on Ctrl+Enter", async () => {
    const { Providers, create } = setup();
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    const box = await screen.findByPlaceholderText("Write a comment…");
    fireEvent.change(box, { target: { value: "Hi" } });

    fireEvent.keyDown(box, { key: "Enter" });
    expect(create).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));

    fireEvent.change(box, { target: { value: "Again" } });
    fireEvent.keyDown(box, { key: "Enter", metaKey: true });
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  });

  it("CommentsThread posts as anonymous when the app has no auth provider", async () => {
    const { Providers, create } = setup();
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    const box = await screen.findByPlaceholderText("Write a comment…");
    fireEvent.change(box, { target: { value: "Hi" } });
    fireEvent.click(screen.getByText("Post"));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const call = create.mock.calls[0] as [
      string,
      { data: Record<string, unknown> },
    ];
    expect(call[1].data.authorId).toBe("anonymous");
  });

  it("CommentsThread shows Mark resolved only with resolvable and only on unresolved comments", async () => {
    const comments = [
      comment({ id: 1, body: "Open" }),
      comment({ id: 2, body: "Done", resolvedAt: "2026-01-03T10:00:00.000Z" }),
    ];
    const plain = setup({ comments });
    const first = render(
      <CommentsThread reference="comments" target="postId" />,
      { wrapper: plain.Providers },
    );
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.queryByText("Mark resolved")).toBeNull();
    first.unmount();

    const resolvable = setup({ comments });
    render(<CommentsThread reference="comments" target="postId" resolvable />, {
      wrapper: resolvable.Providers,
    });
    await waitFor(() => expect(cards()).toHaveLength(2));
    const [open, done] = cards() as HTMLElement[];
    expect(within(open as HTMLElement).getByText("Mark resolved")).toBeTruthy();
    expect(within(done as HTMLElement).queryByText("Mark resolved")).toBeNull();
    expect(within(done as HTMLElement).getByText(/^Resolved \S/)).toBeTruthy();
  });

  it("CommentsThread resolves a comment with resolvedAt and previousData", async () => {
    const original = comment({ id: 1, body: "Open" });
    const { Providers, update, notifications } = setup({
      comments: [original],
    });
    render(<CommentsThread reference="comments" target="postId" resolvable />, {
      wrapper: Providers,
    });
    fireEvent.click(await screen.findByText("Mark resolved"));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const call = update.mock.calls[0] as [
      string,
      { id: unknown; data: { resolvedAt: string }; previousData: unknown },
    ];
    expect(call[0]).toBe("comments");
    expect(call[1].id).toBe(1);
    expect(Number.isNaN(Date.parse(call[1].data.resolvedAt))).toBe(false);
    expect(call[1].previousData).toMatchObject(original);
    await waitFor(() =>
      expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
        "chelone.notification.updated",
      ]),
    );
    await waitFor(() => expect(screen.queryByText("Mark resolved")).toBeNull());
  });

  it("CommentsThread notifies an error when resolving fails", async () => {
    const { Providers, update, notifications } = setup({
      comments: [comment({ id: 1 })],
    });
    update.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CommentsThread reference="comments" target="postId" resolvable />, {
      wrapper: Providers,
    });
    fireEvent.click(await screen.findByText("Mark resolved"));

    await waitFor(() =>
      expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
        "chelone.notification.http_error",
      ]),
    );
    expect(screen.getByText("Mark resolved")).toBeTruthy();
  });

  it("CommentsThread says how many comments it shows when total is larger", async () => {
    const { Providers } = setup({
      comments: [1, 2, 3].map((id) => comment({ id, body: `c${id}` })),
    });
    render(
      <CommentsThread reference="comments" target="postId" perPage={2} />,
      { wrapper: Providers },
    );

    expect(
      await screen.findByText("Showing the first 2 of 3 comments"),
    ).toBeTruthy();
    expect(cards()).toHaveLength(2);
  });

  it("CommentsThread shows a comment created through another client on a realtime provider", async () => {
    const transport = memoryTransport();
    const fake = addEventsForMutations(
      fakeDataProvider({ comments: [comment({ id: 1 })] } as never),
      transport,
    ) as DataProvider;
    const { Providers } = setup({
      provider: realtimeDataProvider(fake, transport),
    });
    // A second client on the same transport and the same store.
    const other = realtimeDataProvider(fake, transport);
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    await waitFor(() => expect(cards()).toHaveLength(1));

    await act(async () => {
      await other.create("comments", {
        data: comment({ id: undefined, body: "From afar" }),
      } as never);
    });

    expect(await screen.findByText("From afar")).toBeTruthy();
    expect(cards()).toHaveLength(2);
  });

  it("CommentsThread works on a plain data provider", async () => {
    const { Providers, dataProvider } = setup({
      comments: [comment({ id: 1, body: "Plain" })],
    });
    expect((dataProvider as { subscribe?: unknown }).subscribe).toBeUndefined();
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });

    expect(await screen.findByText("Plain")).toBeTruthy();
  });
  it("CommentsThread makes the textarea read-only while a post is in flight", async () => {
    const { Providers, create } = setup();
    let release: () => void = () => {};
    create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { id: 1 } } as never);
        }),
    );
    render(<CommentsThread reference="comments" target="postId" />, {
      wrapper: Providers,
    });
    const box = (await screen.findByPlaceholderText(
      "Write a comment…",
    )) as HTMLTextAreaElement;
    expect(box.readOnly).toBe(false);
    fireEvent.change(box, { target: { value: "Hi" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(box.readOnly).toBe(true));
    await act(async () => release());
    await waitFor(() => expect(box.value).toBe(""));
    expect(box.readOnly).toBe(false);
  });

  it("CommentsThread drops an unsent draft when the record changes", async () => {
    const { Providers, create } = setup();
    const { rerender } = render(
      <CommentsThread
        reference="comments"
        target="postId"
        record={{ id: 7 }}
      />,
      { wrapper: Providers },
    );
    const box = (await screen.findByPlaceholderText(
      "Write a comment…",
    )) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "For seven" } });

    rerender(
      <CommentsThread
        reference="comments"
        target="postId"
        record={{ id: 8 }}
      />,
    );

    expect(
      (screen.getByPlaceholderText("Write a comment…") as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(create).not.toHaveBeenCalled();
  });
});
