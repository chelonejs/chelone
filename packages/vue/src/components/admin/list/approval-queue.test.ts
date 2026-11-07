/**
 * `<ApprovalQueue>`: a row per record of the ambient `<List>`, with Approve
 * and a Reject that asks for a reason. Mounted as
 * `<Admin><Resource list/></Admin>` with a memory router; assertions are on
 * DOM, roles and data-provider calls.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import List from "../view/list.vue";
import ApprovalQueue, { type ApprovalQueueProps } from "./approval-queue.vue";

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const authFor = (
  id: string | number | undefined,
  over: Partial<AuthProvider> = {},
): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...(id === undefined ? {} : { getIdentity: async () => ({ id }) }),
  ...over,
});

const POSTS = [
  { id: 1, title: "Alpha", author: "Ann", approvers: [], status: "pending" },
  { id: 2, title: "Beta", author: null, approvers: ["u2"], status: "pending" },
];

/**
 * `fakeDataProvider` edits its stored records in place and `getList` hands them
 * out as they are, so the list would hold the very objects an update changes.
 * Cloning on the way out keeps `previousData` as it was.
 */
function provider(records: readonly LooseRecord[] = POSTS): DataProvider {
  const inner = fakeDataProvider({ posts: [...records] });
  const getList = inner.getList.bind(inner);
  inner.getList = async (...args) => structuredClone(await getList(...args));
  return inner;
}

async function mountQueue({
  queue = {},
  extra,
  dataProvider = provider(),
  authProvider = authFor("u1"),
}: {
  queue?: Partial<ApprovalQueueProps>;
  extra?: (props: { record: LooseRecord }) => ReturnType<typeof h>;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/posts");
  const PostList = defineComponent({
    setup: () => () =>
      h(
        List,
        { resource: "posts" },
        {
          default: () =>
            h(ApprovalQueue<LooseRecord>, queue, extra ? { extra } : undefined),
        },
      ),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          notifications,
          queryClient: new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          }),
          i18n: createI18n({ locale: "en", messages: { en: {} } }),
        },
        { default: () => h(Resource, { name: "posts", list: PostList }) },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, notify, dataProvider };
}

const rowOf = (wrapper: VueWrapper, id: number) =>
  wrapper.get(`[data-slot=approval-queue-row][data-record-id="${id}"]`);

function buttonIn(row: ReturnType<typeof rowOf>, name: string | RegExp) {
  const found = row
    .findAll("button")
    .find((b) =>
      typeof name === "string" ? b.text() === name : name.test(b.text()),
    );
  if (!found) throw new Error(`no button ${String(name)}`);
  return found;
}
const rejectIn = (row: ReturnType<typeof rowOf>) => buttonIn(row, "Reject");
const reasonIn = (row: ReturnType<typeof rowOf>) => row.get("textarea[id]");
const isDisabled = (button: ReturnType<typeof rowOf>) =>
  button.attributes("disabled") !== undefined;

/** Reject stays disabled until the identity query resolves. */
const signedIn = (wrapper: VueWrapper) =>
  vi.waitFor(() => expect(isDisabled(rejectIn(rowOf(wrapper, 1)))).toBe(false));

const waitForRows = (wrapper: VueWrapper) =>
  vi.waitFor(() =>
    expect(wrapper.find("[data-slot=approval-queue-row]").exists()).toBe(true),
  );

describe("<ApprovalQueue>", () => {
  it("renders a row per record of the list with its title and subtitle", async () => {
    const { wrapper } = await mountQueue({
      queue: { titleSource: "title", subtitleSource: "author" },
    });

    await waitForRows(wrapper);
    const root = wrapper.get("[role=list]");
    expect(root.attributes("data-slot")).toBe("approval-queue");
    const rows = root.findAll("[role=listitem]");
    expect(rows.map((r) => r.attributes("data-record-id"))).toEqual(["1", "2"]);
    expect(rows[0]?.attributes("data-slot")).toBe("approval-queue-row");
    expect(rowOf(wrapper, 1).text()).toContain("Alpha");
    expect(
      rowOf(wrapper, 1).get("[data-slot=approval-queue-subtitle]").text(),
    ).toBe("Ann");
    // An empty subtitle adds no second line.
    expect(
      rowOf(wrapper, 2).find("[data-slot=approval-queue-subtitle]").exists(),
    ).toBe(false);
  });

  it("titleSource wins over the record representation", async () => {
    const { wrapper } = await mountQueue({ queue: { titleSource: "author" } });

    await waitForRows(wrapper);
    expect(
      rowOf(wrapper, 1).get("[data-slot=approval-queue-title]").text(),
    ).toBe("Ann");
    // Beta has an empty author, so it falls back to the representation (title).
    expect(
      rowOf(wrapper, 2).get("[data-slot=approval-queue-title]").text(),
    ).toBe("Beta");
  });

  it("shows the empty text when the list has no records", async () => {
    const { wrapper } = await mountQueue({ dataProvider: provider([]) });

    await vi.waitFor(() =>
      expect(wrapper.find("[data-slot=approval-queue-empty]").exists()).toBe(
        true,
      ),
    );
    expect(wrapper.get("[data-slot=approval-queue-empty]").text()).toBe(
      "No items waiting for approval",
    );
    expect(wrapper.find("[role=list]").exists()).toBe(false);
  });

  it("the extra slot renders inside each row with the row's record", async () => {
    const { wrapper } = await mountQueue({
      extra: ({ record }) =>
        h("span", { "data-testid": "extra" }, String(record.title)),
    });

    await waitForRows(wrapper);
    expect(rowOf(wrapper, 1).get("[data-testid=extra]").text()).toBe("Alpha");
    expect(rowOf(wrapper, 2).get("[data-testid=extra]").text()).toBe("Beta");
  });

  it("Approve records the signed-in user and approves with required 1 by default", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountQueue({ dataProvider });

    await waitForRows(wrapper);
    await signedIn(wrapper);
    await buttonIn(rowOf(wrapper, 1), /Approve/).trigger("click");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { approvers: ["u1"], status: "approved" },
      previousData: POSTS[0],
    });
  });

  it("Reject opens a reason form, and Confirm reject writes the rejected status, the reason and the user", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper, notify } = await mountQueue({ dataProvider });

    await waitForRows(wrapper);
    await signedIn(wrapper);
    await rejectIn(rowOf(wrapper, 1)).trigger("click");
    const reason = reasonIn(rowOf(wrapper, 1));
    expect(reason.element.tagName).toBe("TEXTAREA");
    expect(rowOf(wrapper, 1).get("label").attributes("for")).toBe(
      reason.attributes("id"),
    );
    expect(rowOf(wrapper, 1).get("label").text()).toBe("Reason");
    expect(rowOf(wrapper, 2).find("textarea").exists()).toBe(false);
    await reason.setValue("  Too vague  ");
    await buttonIn(rowOf(wrapper, 1), "Confirm reject").trigger("click");

    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: {
        status: "rejected",
        rejectedBy: "u1",
        rejectionNote: "Too vague",
      },
      previousData: POSTS[0],
    });
    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ),
    );
    await vi.waitFor(() =>
      expect(rowOf(wrapper, 1).find("textarea").exists()).toBe(false),
    );
  });

  it("with requireReason Confirm reject stays disabled until a reason is typed", async () => {
    const { wrapper } = await mountQueue({ queue: { requireReason: true } });

    await waitForRows(wrapper);
    await signedIn(wrapper);
    await rejectIn(rowOf(wrapper, 1)).trigger("click");
    const confirm = () => buttonIn(rowOf(wrapper, 1), "Confirm reject");
    expect(isDisabled(confirm())).toBe(true);
    await reasonIn(rowOf(wrapper, 1)).setValue("   ");
    expect(isDisabled(confirm())).toBe(true);
    await reasonIn(rowOf(wrapper, 1)).setValue("No");
    expect(isDisabled(confirm())).toBe(false);
  });

  it("Cancel closes the reason form and writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { wrapper } = await mountQueue({ dataProvider });

    await waitForRows(wrapper);
    await signedIn(wrapper);
    await rejectIn(rowOf(wrapper, 1)).trigger("click");
    await reasonIn(rowOf(wrapper, 1)).setValue("Maybe");
    await buttonIn(rowOf(wrapper, 1), "Cancel").trigger("click");

    expect(rowOf(wrapper, 1).find("textarea").exists()).toBe(false);
    await rejectIn(rowOf(wrapper, 1)).trigger("click");
    expect(reasonIn(rowOf(wrapper, 1)).element).toHaveProperty("value", "");
    expect(update).not.toHaveBeenCalled();
  });

  it("a rejected update keeps the form and the reason, and notifies an error", async () => {
    const dataProvider = provider();
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("nope"));
    const { wrapper, notify } = await mountQueue({ dataProvider });

    await waitForRows(wrapper);
    await signedIn(wrapper);
    await rejectIn(rowOf(wrapper, 1)).trigger("click");
    await reasonIn(rowOf(wrapper, 1)).setValue("Too vague");
    await buttonIn(rowOf(wrapper, 1), "Confirm reject").trigger("click");

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(reasonIn(rowOf(wrapper, 1)).element).toHaveProperty(
      "value",
      "Too vague",
    );
    expect(notify).not.toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.anything(),
    );
  });

  it("Reject is absent without edit access and disabled without an identity", async () => {
    const denied = authFor("u1", { canAccess: vi.fn(async () => false) });
    const first = await mountQueue({ authProvider: denied });
    await waitForRows(first.wrapper);
    await vi.waitFor(() => expect(denied.canAccess).toHaveBeenCalled());
    await flushPromises();
    expect(
      first.wrapper.findAll("button").some((b) => b.text() === "Reject"),
    ).toBe(false);
    first.wrapper.unmount();

    const second = await mountQueue({ authProvider: authFor(undefined) });
    await waitForRows(second.wrapper);
    const reject = rejectIn(rowOf(second.wrapper, 1));
    expect(reject.attributes("data-slot")).toBe("approval-queue-reject");
    expect(isDisabled(reject)).toBe(true);
  });

  it("renders a title and subtitle that hold markup as text", async () => {
    const hostile = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const { wrapper } = await mountQueue({
      dataProvider: provider([
        { id: 1, title: hostile, author: script, status: "pending" },
      ]),
      queue: { titleSource: "title", subtitleSource: "author" },
    });

    await waitForRows(wrapper);
    expect(wrapper.get("[data-slot=approval-queue-title]").text()).toBe(
      hostile,
    );
    expect(wrapper.get("[data-slot=approval-queue-subtitle]").text()).toBe(
      script,
    );
    expect(wrapper.find("[data-slot=approval-queue] img").exists()).toBe(false);
    expect(wrapper.find("[data-slot=approval-queue] script").exists()).toBe(
      false,
    );
    expect(document.querySelector("img")).toBeNull();
  });
});
