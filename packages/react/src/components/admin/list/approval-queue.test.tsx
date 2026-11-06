/**
 * `<ApprovalQueue>`: a row per record of the ambient `<List>`, with Approve
 * and a Reject that asks for a reason. Mounted as
 * `<MemoryRouter><Admin><Resource list/></Admin></MemoryRouter>`; assertions
 * are on DOM, roles and data-provider calls.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin/admin";
import { useRecordContext } from "../../../record/record-context";
import { Resource } from "../../../resource";
import { List } from "../views/list";
import { ApprovalQueue, type ApprovalQueueProps } from "./approval-queue";

afterEach(cleanup);

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
  {
    id: 1,
    title: "Alpha",
    author: "Ann",
    approvers: [],
    status: "pending",
  },
  {
    id: 2,
    title: "Beta",
    author: null,
    approvers: ["u2"],
    status: "pending",
  },
];

/**
 * `fakeDataProvider` edits its stored records in place and `getList` hands them
 * out as they are, so the list would hold the very objects an update changes.
 * Cloning on the way out keeps `previousData` as it was. `pendingOnly` stands
 * in for a server-side filter on pending.
 */
function provider(
  records: readonly LooseRecord[] = POSTS,
  pendingOnly = false,
): DataProvider {
  const inner = fakeDataProvider({ posts: [...records] });
  const getList = inner.getList.bind(inner);
  inner.getList = async (...args) => {
    const result = structuredClone(await getList(...args));
    if (!pendingOnly) return result;
    const data = result.data.filter((r) => r.status === "pending");
    return { ...result, data, total: data.length };
  };
  return inner;
}

function mount({
  queue = {},
  dataProvider = provider(),
  authProvider = authFor("u1"),
}: {
  queue?: Partial<ApprovalQueueProps>;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const list = (): ReactNode => (
    <List>
      <ApprovalQueue {...queue} />
    </List>
  );
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        queryClient={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        notifications={notifications}
      >
        <Resource name="posts" list={list} />
      </Admin>
    </MemoryRouter>,
  );
  return { notify, dataProvider };
}

const rowOf = (id: number) => {
  const found = document.querySelector<HTMLElement>(
    `[data-slot=approval-queue-row][data-record-id="${id}"]`,
  );
  if (!found) throw new Error(`no row with id ${id}`);
  return found;
};

const buttonIn = (row: HTMLElement, name: string | RegExp) => {
  const found = within(row).getByRole("button", { name });
  if (!(found instanceof HTMLButtonElement)) throw new Error("not a button");
  return found;
};
const rejectIn = (row: HTMLElement) => buttonIn(row, "Reject");
const reasonIn = (row: HTMLElement) => {
  const found = within(row).getByLabelText("Reason");
  if (!(found instanceof HTMLTextAreaElement)) throw new Error("no textarea");
  return found;
};

/** Reject stays disabled until the identity query resolves. */
const signedIn = () =>
  waitFor(() => expect(rejectIn(rowOf(1)).disabled).toBe(false));

describe("<ApprovalQueue>", () => {
  it("renders a row per record of the list with its title and subtitle", async () => {
    mount({ queue: { titleSource: "title", subtitleSource: "author" } });

    await screen.findByText("Alpha");
    const root = screen.getByRole("list");
    expect(root.getAttribute("data-slot")).toBe("approval-queue");
    const rows = within(root).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.getAttribute("data-record-id"))).toEqual([
      "1",
      "2",
    ]);
    expect(rows[0]?.getAttribute("data-slot")).toBe("approval-queue-row");
    expect(within(rowOf(1)).getByText("Alpha")).toBeTruthy();
    expect(within(rowOf(1)).getByText("Ann")).toBeTruthy();
    // An empty subtitle adds no second line.
    expect(rows[1]?.querySelector("[data-slot=approval-queue-subtitle]")).toBe(
      null,
    );
  });

  it("titleSource wins over the record representation", async () => {
    mount({ queue: { titleSource: "author" } });

    await screen.findByText("Ann");
    // Beta has an empty author, so it falls back to the representation (title).
    expect(within(rowOf(2)).getByText("Beta")).toBeTruthy();
    expect(within(rowOf(1)).queryByText("Alpha")).toBeNull();
  });

  it("shows the empty text when the list has no records", async () => {
    mount({ dataProvider: provider([]) });

    const empty = await screen.findByText("No items waiting for approval");
    expect(empty.getAttribute("data-slot")).toBe("approval-queue-empty");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("rowExtra renders inside each row with the row's record in context", async () => {
    const Extra = () => (
      <span data-testid="extra">
        {String(useRecordContext<{ title: string }>()?.title)}
      </span>
    );
    mount({ queue: { rowExtra: () => <Extra /> } });

    await screen.findAllByTestId("extra");
    expect(within(rowOf(1)).getByTestId("extra").textContent).toBe("Alpha");
    expect(within(rowOf(2)).getByTestId("extra").textContent).toBe("Beta");
  });

  it("Approve records the signed-in user and approves with required 1 by default", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });

    await screen.findByText("Alpha");
    await signedIn();
    fireEvent.click(within(rowOf(1)).getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { approvers: ["u1"], status: "approved" },
      previousData: POSTS[0],
    });
  });

  it("Reject opens a reason form, and Confirm reject writes the rejected status, the reason and the user", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    const { notify } = mount({ dataProvider });

    await screen.findByText("Alpha");
    await signedIn();
    fireEvent.click(rejectIn(rowOf(1)));
    const reason = within(rowOf(1)).getByLabelText("Reason");
    expect(reason.tagName).toBe("TEXTAREA");
    expect(within(rowOf(2)).queryByLabelText("Reason")).toBeNull();
    fireEvent.change(reason, { target: { value: "  Too vague  " } });
    fireEvent.click(
      within(rowOf(1)).getByRole("button", { name: "Confirm reject" }),
    );

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: {
        status: "rejected",
        rejectedBy: "u1",
        rejectionNote: "Too vague",
      },
      previousData: POSTS[0],
    });
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ),
    );
    await waitFor(() =>
      expect(within(rowOf(1)).queryByLabelText("Reason")).toBeNull(),
    );
  });

  it("with requireReason Confirm reject stays disabled until a reason is typed", async () => {
    mount({ queue: { requireReason: true } });

    await screen.findByText("Alpha");
    await signedIn();
    fireEvent.click(rejectIn(rowOf(1)));
    const confirm = buttonIn(rowOf(1), "Confirm reject");
    expect(confirm.disabled).toBe(true);
    const reason = reasonIn(rowOf(1));
    fireEvent.change(reason, { target: { value: "   " } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(reason, { target: { value: "No" } });
    expect(confirm.disabled).toBe(false);
  });

  it("Cancel closes the reason form and writes nothing", async () => {
    const dataProvider = provider();
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider });

    await screen.findByText("Alpha");
    await signedIn();
    fireEvent.click(rejectIn(rowOf(1)));
    fireEvent.change(within(rowOf(1)).getByLabelText("Reason"), {
      target: { value: "Maybe" },
    });
    fireEvent.click(within(rowOf(1)).getByRole("button", { name: "Cancel" }));

    expect(within(rowOf(1)).queryByLabelText("Reason")).toBeNull();
    fireEvent.click(rejectIn(rowOf(1)));
    expect(reasonIn(rowOf(1)).value).toBe("");
    expect(update).not.toHaveBeenCalled();
  });

  it("a rejected update keeps the form and the reason, and notifies an error", async () => {
    const dataProvider = provider();
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("nope"));
    const { notify } = mount({ dataProvider });

    await screen.findByText("Alpha");
    await signedIn();
    fireEvent.click(rejectIn(rowOf(1)));
    fireEvent.change(within(rowOf(1)).getByLabelText("Reason"), {
      target: { value: "Too vague" },
    });
    fireEvent.click(
      within(rowOf(1)).getByRole("button", { name: "Confirm reject" }),
    );

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(reasonIn(rowOf(1)).value).toBe("Too vague");
    expect(notify).not.toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.anything(),
    );
  });

  it("a row leaves a list filtered on pending once its rejection resolves", async () => {
    mount({ dataProvider: provider(POSTS, true) });

    await screen.findByText("Alpha");
    await signedIn();
    fireEvent.click(rejectIn(rowOf(1)));
    fireEvent.click(
      within(rowOf(1)).getByRole("button", { name: "Confirm reject" }),
    );

    await waitFor(() =>
      expect(
        document.querySelector(
          "[data-slot=approval-queue-row][data-record-id='1']",
        ),
      ).toBeNull(),
    );
    expect(rowOf(2)).toBeTruthy();
  });

  it("Reject is absent without edit access and disabled without an identity", async () => {
    const denied = authFor("u1", { canAccess: vi.fn(async () => false) });
    mount({ authProvider: denied });
    await screen.findByText("Alpha");
    await waitFor(() => expect(denied.canAccess).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
    cleanup();

    mount({ authProvider: authFor(undefined) });
    await screen.findByText("Alpha");
    const reject = rejectIn(rowOf(1));
    expect(reject.getAttribute("data-slot")).toBe("approval-queue-reject");
    expect(reject.disabled).toBe(true);
  });

  it("renders a title and subtitle that hold markup as text", async () => {
    const hostile = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    mount({
      dataProvider: provider([
        { id: 1, title: hostile, author: script, status: "pending" },
      ]),
      queue: { titleSource: "title", subtitleSource: "author" },
    });

    await screen.findByText(hostile);
    expect(screen.getByText(script)).toBeTruthy();
    expect(document.querySelector("[data-slot=approval-queue] img")).toBeNull();
    expect(
      document.querySelector("[data-slot=approval-queue] script"),
    ).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });
});
