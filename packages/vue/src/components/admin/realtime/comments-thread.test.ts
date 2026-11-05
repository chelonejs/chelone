/**
 * `<CommentsThread>` mounted under a real `<Admin>` over a fake data provider
 * (and a `realtimeDataProvider` on a `memoryTransport` for the live cases).
 * Cases assert the cards in the DOM and the calls the provider received.
 */

import {
  type AuthProvider,
  addEventsForMutations,
  createNotificationStore,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  type NotificationStore,
  type RecordOf,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import Textarea from "../../ui/textarea.vue";
import CommentsThread, {
  type CommentsThreadProps,
} from "./comments-thread.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: {
    schema: z.object({
      id: z.number(),
      postId: z.number(),
      authorId: z.union([z.string(), z.number()]).optional(),
      authorName: z.string().optional(),
      body: z.string(),
      createdAt: z.string(),
      resolvedAt: z.string().nullable().optional(),
    }),
  },
});
type Resources = typeof resources;

type Comment = RecordOf<Resources, "comments">;

const comments: Comment[] = [
  {
    id: 1,
    postId: 1,
    authorId: "ada",
    authorName: "Ada Lovelace",
    body: "first",
    createdAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 2,
    postId: 1,
    authorId: "grace",
    body: "second",
    createdAt: "2026-01-02T10:00:00.000Z",
  },
  {
    id: 3,
    postId: 2,
    authorName: "Linus",
    body: "elsewhere",
    createdAt: "2026-01-03T10:00:00.000Z",
  },
];

function setup(rows: Comment[] = comments) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
    comments: rows,
  });
  return { dataProvider };
}

type Provider = ReturnType<typeof setup>["dataProvider"];

function mountThread(
  dataProvider: Provider,
  props: Partial<CommentsThreadProps> = {},
  options: {
    authProvider?: AuthProvider;
    notifications?: NotificationStore;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient, ...options },
        {
          default: () =>
            h(CommentsThread, {
              reference: "comments",
              target: "postId",
              record: { id: 1 },
              ...props,
            }),
          layout: () => h("div"),
        },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const cards = (wrapper: ReturnType<typeof mountThread>) =>
  wrapper.findAll('[data-slot="comment"]');

describe("Textarea", () => {
  it("Textarea updates its v-model on input", async () => {
    const draft = ref("");
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(Textarea, {
            modelValue: draft.value,
            "onUpdate:modelValue": (value: string) => {
              draft.value = value;
            },
          }),
      }),
    );

    const textarea = wrapper.get("textarea");
    expect(textarea.attributes("data-slot")).toBe("textarea");
    await textarea.setValue("hello");

    expect(draft.value).toBe("hello");
    expect(textarea.element.value).toBe("hello");
  });
});

describe("CommentsThread", () => {
  it("CommentsThread renders one card per comment of the record and none of another record", async () => {
    const { dataProvider } = setup();
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(
      cards(wrapper).map((card) => card.attributes("data-comment-id")),
    ).toEqual(["1", "2"]);
    expect(cards(wrapper)[0]?.text()).toContain("first");
    expect(wrapper.text()).not.toContain("elsewhere");
  });

  it("CommentsThread shows the author name, falling back to the author id", async () => {
    const { dataProvider } = setup();
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(cards(wrapper)[0]?.text()).toContain("Ada Lovelace");
    expect(cards(wrapper)[1]?.text()).toContain("grace");
  });

  it("CommentsThread asks the provider for the target filter and createdAt ascending", async () => {
    const { dataProvider } = setup();
    const getList = vi.spyOn(dataProvider, "getList");
    mountThread(dataProvider, { perPage: 20 });
    await flushPromises();

    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        filter: { postId: 1 },
        sort: { field: "createdAt", order: "ASC" },
        pagination: { page: 1, perPage: 20 },
      }),
    );
  });

  it("CommentsThread renders nothing and fetches nothing without a record", async () => {
    const { dataProvider } = setup();
    const getList = vi.spyOn(dataProvider, "getList");
    const wrapper = mountThread(dataProvider, { record: undefined });
    await flushPromises();
    const noId = mountThread(dataProvider, {
      record: {} as CommentsThreadProps["record"],
    });
    await flushPromises();

    expect(wrapper.find('[data-slot="comments-thread"]').exists()).toBe(false);
    expect(noId.find('[data-slot="comments-thread"]').exists()).toBe(false);
    expect(getList).not.toHaveBeenCalled();
  });

  it("CommentsThread shows the empty state with no comments", async () => {
    const { dataProvider } = setup([]);
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(cards(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("No comments yet");
  });

  it("CommentsThread omits the time of a comment with an unparsable createdAt", async () => {
    const { dataProvider } = setup([
      { id: 1, postId: 1, body: "good", createdAt: "2026-01-01T10:00:00.000Z" },
      { id: 2, postId: 1, body: "bad", createdAt: "yesterday-ish" },
    ]);
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(cards(wrapper)[0]?.find("time").exists()).toBe(true);
    expect(cards(wrapper)[1]?.find("time").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Invalid Date");
  });

  it("CommentsThread says how many comments it shows when total is larger", async () => {
    const { dataProvider } = setup();
    const wrapper = mountThread(dataProvider, { perPage: 1 });
    await flushPromises();

    expect(cards(wrapper)).toHaveLength(1);
    expect(wrapper.text()).toContain("Showing the first 1 of 2 comments");

    const all = mountThread(dataProvider);
    await flushPromises();
    expect(all.text()).not.toContain("Showing the first");
  });

  const rin: AuthProvider = {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    getIdentity: async () => ({ id: 7, fullName: "Rin" }),
  };

  const postButton = (wrapper: ReturnType<typeof mountThread>) =>
    wrapper.findAll("button").find((button) => button.text() === "Post");

  it("CommentsThread posts a trimmed comment with the target, author and createdAt, then clears the draft", async () => {
    const { dataProvider } = setup();
    const create = vi.spyOn(dataProvider, "create");
    const notifications = createNotificationStore();
    const wrapper = mountThread(
      dataProvider,
      {},
      {
        authProvider: rin,
        notifications,
      },
    );
    await flushPromises();

    await wrapper.get("textarea").setValue("  hello there  ");
    await postButton(wrapper)?.trigger("click");
    await flushPromises();

    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0]?.[1] as {
      data: Record<string, unknown>;
    };
    expect(create.mock.calls[0]?.[0]).toBe("comments");
    expect(params.data).toMatchObject({
      postId: 1,
      authorId: 7,
      authorName: "Rin",
      body: "hello there",
    });
    expect(Number.isNaN(Date.parse(String(params.data.createdAt)))).toBe(false);
    expect(wrapper.get("textarea").element.value).toBe("");
    expect(cards(wrapper).map((card) => card.text())).toContainEqual(
      expect.stringContaining("hello there"),
    );
    expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
      "chelone.notification.updated",
    ]);
  });

  it("CommentsThread keeps the draft and notifies an error when the create fails", async () => {
    const { dataProvider } = setup();
    vi.spyOn(dataProvider, "create").mockRejectedValue(new Error("nope"));
    const notifications = createNotificationStore();
    const wrapper = mountThread(dataProvider, {}, { notifications });
    await flushPromises();

    await wrapper.get("textarea").setValue("keep me");
    await postButton(wrapper)?.trigger("click");
    await flushPromises();

    expect(wrapper.get("textarea").element.value).toBe("keep me");
    expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
      "chelone.notification.http_error",
    ]);
    expect(postButton(wrapper)?.attributes("disabled")).toBeUndefined();
  });

  it("CommentsThread disables Post for a blank body and while posting", async () => {
    const { dataProvider } = setup();
    let release: () => void = () => {};
    const create = vi.spyOn(dataProvider, "create").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { ...comments[0], id: 9 } });
        }),
    );
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(postButton(wrapper)?.attributes("disabled")).toBeDefined();
    await wrapper.get("textarea").setValue("   ");
    expect(postButton(wrapper)?.attributes("disabled")).toBeDefined();

    await wrapper.get("textarea").setValue("real");
    expect(postButton(wrapper)?.attributes("disabled")).toBeUndefined();
    await postButton(wrapper)?.trigger("click");
    await flushPromises();
    expect(postButton(wrapper)?.attributes("disabled")).toBeDefined();
    await postButton(wrapper)?.trigger("click");
    expect(create).toHaveBeenCalledTimes(1);

    release();
    await flushPromises();
    expect(postButton(wrapper)?.attributes("disabled")).toBeDefined();
    expect(wrapper.get("textarea").element.value).toBe("");
  });

  it("CommentsThread posts on Ctrl+Enter", async () => {
    const { dataProvider } = setup();
    const create = vi.spyOn(dataProvider, "create");
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    await wrapper.get("textarea").setValue("by keyboard");
    await wrapper.get("textarea").trigger("keydown", { key: "Enter" });
    expect(create).not.toHaveBeenCalled();
    await wrapper
      .get("textarea")
      .trigger("keydown", { key: "Enter", ctrlKey: true });
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(1);

    await wrapper.get("textarea").setValue("by mac keyboard");
    await wrapper
      .get("textarea")
      .trigger("keydown", { key: "Enter", metaKey: true });
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("CommentsThread shows Mark resolved only with resolvable and only on unresolved comments", async () => {
    const { dataProvider } = setup([
      ...comments.slice(0, 1),
      {
        id: 2,
        postId: 1,
        body: "done",
        createdAt: "2026-01-02T10:00:00.000Z",
        resolvedAt: "2026-01-03T10:00:00.000Z",
      },
    ]);
    const plain = mountThread(dataProvider);
    const resolvable = mountThread(dataProvider, { resolvable: true });
    await flushPromises();

    expect(plain.text()).not.toContain("Mark resolved");
    expect(
      resolvable.findAll("button").filter((b) => b.text() === "Mark resolved"),
    ).toHaveLength(1);
    expect(cards(resolvable)[0]?.text()).toContain("Mark resolved");
    expect(cards(resolvable)[1]?.text()).not.toContain("Mark resolved");
    expect(cards(resolvable)[1]?.text()).toContain("Resolved");
  });

  it("CommentsThread resolves a comment with resolvedAt and previousData", async () => {
    const { dataProvider } = setup();
    const update = vi.spyOn(dataProvider, "update");
    const notifications = createNotificationStore();
    const wrapper = mountThread(
      dataProvider,
      { resolvable: true },
      {
        notifications,
      },
    );
    await flushPromises();

    await cards(wrapper)[0]
      ?.findAll("button")
      .find((b) => b.text() === "Mark resolved")
      ?.trigger("click");
    await flushPromises();

    expect(update).toHaveBeenCalledWith("comments", {
      id: 1,
      data: { resolvedAt: expect.any(String) },
      previousData: expect.objectContaining({ id: 1, body: "first" }),
    });
    expect(cards(wrapper)[0]?.text()).not.toContain("Mark resolved");
    expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
      "chelone.notification.updated",
    ]);
  });

  it("CommentsThread shows a comment created through another client on a realtime provider", async () => {
    const transport = memoryTransport();
    const base = fakeDataProvider<Resources>({
      posts: [{ id: 1, title: "a" }],
      comments,
    });
    const dataProvider = addEventsForMutations(
      realtimeDataProvider(base, transport),
      transport,
    );
    const wrapper = mountThread(dataProvider);
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(2);

    await dataProvider.create("comments", {
      data: {
        postId: 1,
        body: "from afar",
        createdAt: "2026-02-01T10:00:00.000Z",
      },
    });
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(3);
    expect(cards(wrapper)[2]?.text()).toContain("from afar");

    wrapper.unmount();
    const getList = vi.spyOn(dataProvider, "getList");
    await dataProvider.create("comments", {
      data: { postId: 1, body: "later", createdAt: "2026-02-02T10:00:00.000Z" },
    });
    await flushPromises();
    expect(getList).not.toHaveBeenCalled();
  });

  it("CommentsThread works on a plain data provider", async () => {
    const { dataProvider } = setup();
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(cards(wrapper)).toHaveLength(2);
    await wrapper.get("textarea").setValue("plain post");
    await postButton(wrapper)?.trigger("click");
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(3);
  });

  it("CommentsThread says the comments failed to load instead of showing the empty state", async () => {
    const { dataProvider } = setup();
    vi.spyOn(dataProvider, "getList").mockRejectedValue(new Error("500"));
    const notifications = createNotificationStore();
    const wrapper = mountThread(dataProvider, {}, { notifications });
    await flushPromises();

    expect(wrapper.text()).not.toContain("No comments yet");
    expect(wrapper.text()).toContain("Could not load the comments");
    expect(notifications.getSnapshot().map((n) => n.message)).toEqual([
      "chelone.notification.http_error",
    ]);
  });

  it("CommentsThread does not show the empty state before the first load settles", async () => {
    const { dataProvider } = setup();
    vi.spyOn(dataProvider, "getList").mockImplementation(
      () => new Promise(() => {}),
    );
    const wrapper = mountThread(dataProvider);
    await flushPromises();

    expect(wrapper.text()).not.toContain("No comments yet");
  });

  it("CommentsThread writes to the new resource when reference changes", async () => {
    const { dataProvider } = setup();
    const create = vi.spyOn(dataProvider, "create");
    const update = vi.spyOn(dataProvider, "update");
    const reference = ref<"comments" | "posts">("comments");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            Admin,
            { dataProvider, queryClient },
            {
              default: () =>
                h(CommentsThread, {
                  reference: reference.value,
                  target: "id",
                  resolvable: true,
                  record: { id: 1 },
                }),
              layout: () => h("div"),
            },
          ),
      }),
      {
        global: {
          plugins: [
            createRouter({
              history: createMemoryHistory(),
              routes: [{ path: "/", component: { render: () => null } }],
            }),
          ],
        },
      },
    );
    await flushPromises();

    reference.value = "posts";
    await flushPromises();
    await wrapper.get("textarea").setValue("moved");
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Post")
      ?.trigger("click");
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Mark resolved")
      ?.trigger("click");
    await flushPromises();

    expect(create.mock.calls.map((call) => call[0])).toEqual(["posts"]);
    expect(update.mock.calls.map((call) => call[0])).toEqual(["posts"]);
  });
});
