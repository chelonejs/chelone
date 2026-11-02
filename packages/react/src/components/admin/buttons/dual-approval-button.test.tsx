/**
 * `<DualApprovalButton>` — records the signed-in user's approval on the
 * ambient record. Each test mounts an `<Edit>` route under `<Admin>` and
 * asserts the DOM and the `dataProvider.update` calls.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Admin, Edit, Resource, TextInput } from "../../../index";
import {
  DualApprovalButton,
  type DualApprovalButtonProps,
} from "./dual-approval-button";

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
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

type Post = Record<string, unknown> & { id: number };

const post = (over: Partial<Post> = {}): Post => ({
  id: 1,
  title: "Alpha",
  approvers: [],
  status: "draft",
  ...over,
});

function mount({
  props = {},
  record = post(),
  authProvider = authFor("u1"),
  dataProvider = fakeDataProvider({ posts: [record] }),
}: {
  props?: Partial<DualApprovalButtonProps>;
  record?: Post;
  authProvider?: AuthProvider;
  dataProvider?: DataProvider;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const button: ReactNode = <DualApprovalButton {...props} />;
  render(
    <MemoryRouter initialEntries={["/posts/1"]}>
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
        notifications={notifications}
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
      >
        <Resource
          name="posts"
          edit={() => (
            <Edit actions={button}>
              <TextInput source="title" />
            </Edit>
          )}
        />
      </Admin>
    </MemoryRouter>,
  );
  return { notify, dataProvider };
}

describe("DualApprovalButton", () => {
  it("shows Approve and the count of approvers out of required", async () => {
    mount({ record: post({ approvers: ["u2"] }) });

    const button = await screen.findByRole("button", { name: /Approve/ });
    expect(button.getAttribute("data-slot")).toBe("dual-approval-button");
    expect(button.textContent).toContain("1 of 2");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("updates the record with the approver list and the pending status", async () => {
    const dataProvider = fakeDataProvider({
      posts: [post({ approvers: ["u2"] })],
    });
    const update = vi.spyOn(dataProvider, "update");
    const { notify } = mount({
      record: post({ approvers: ["u2"] }),
      dataProvider,
      props: { required: 3 },
    });

    fireEvent.click(await screen.findByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { approvers: ["u2", "u1"], status: "pending" },
      previousData: post({ approvers: ["u2"] }),
    });
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ),
    );
  });

  it("sets the approved status on the approval that reaches required", async () => {
    const dataProvider = fakeDataProvider({
      posts: [post({ approvers: ["u2"] })],
    });
    const update = vi.spyOn(dataProvider, "update");
    mount({ record: post({ approvers: ["u2"] }), dataProvider });

    fireEvent.click(await screen.findByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].data).toEqual({
      approvers: ["u2", "u1"],
      status: "approved",
    });
    expect(await screen.findByText(/Fully approved \(2 of 2\)/)).toBeTruthy();
  });

  it("is disabled for a user who already approved, even when the stored ids are numbers", async () => {
    mount({
      record: post({ approvers: [7] }),
      authProvider: authFor("7"),
      props: { required: 3 },
    });

    const button = await screen.findByRole("button", {
      name: /You already approved/,
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("title")).toBe("You already approved");
  });

  it("is disabled without an identity", async () => {
    mount({ authProvider: authFor(undefined) });

    const button = await screen.findByRole("button", { name: /Approve/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Fully approved once the threshold is met", async () => {
    mount({ record: post({ approvers: ["u2", "u3"] }) });

    const done = await screen.findByText("Fully approved (2 of 2)");
    expect(done.getAttribute("data-slot")).toBe("dual-approval-complete");
    expect(screen.queryByRole("button", { name: /Approve/ })).toBeNull();
  });

  it("uses custom sources, values and required", async () => {
    const record = post({ signoffs: ["u2"], stage: "open" });
    const dataProvider = fakeDataProvider({ posts: [record] });
    const update = vi.spyOn(dataProvider, "update");
    mount({
      record,
      dataProvider,
      props: {
        required: 2,
        approverSource: "signoffs",
        statusSource: "stage",
        pendingValue: "waiting",
        approvedValue: "done",
      },
    });

    const button = await screen.findByRole("button", { name: /Approve/ });
    expect(button.textContent).toContain("1 of 2");
    fireEvent.click(button);

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].data).toEqual({
      signoffs: ["u2", "u1"],
      stage: "done",
    });
  });

  it("renders nothing without edit access", async () => {
    const canAccess = vi.fn(async () => false);
    mount({ authProvider: authFor("u1", { canAccess }) });

    await waitFor(() => expect(canAccess).toHaveBeenCalled());
    await screen.findByLabelText(/title/i);
    expect(screen.queryByRole("button", { name: /Approve/ })).toBeNull();
    expect(screen.queryByText(/of 2/)).toBeNull();
  });

  it("notifies an error and keeps the count when the update fails", async () => {
    const dataProvider = fakeDataProvider({
      posts: [post({ approvers: ["u2"] })],
    });
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("nope"));
    const { notify } = mount({
      record: post({ approvers: ["u2"] }),
      dataProvider,
    });

    const button = await screen.findByRole("button", { name: /Approve/ });
    fireEvent.click(button);

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    const again = await screen.findByRole("button", { name: /Approve/ });
    expect(again.textContent).toContain("1 of 2");
    expect((again as HTMLButtonElement).disabled).toBe(false);
  });

  it("is disabled while its update is pending", async () => {
    const dataProvider = fakeDataProvider({ posts: [post()] });
    let settle: () => void = () => {};
    vi.spyOn(dataProvider, "update").mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = () =>
            resolve({ data: post({ approvers: ["u1"] }) } as never);
        }),
    );
    mount({ dataProvider, props: { required: 3 } });

    const button = await screen.findByRole("button", { name: /Approve/ });
    fireEvent.click(button);

    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(true),
    );
    settle();
  });
});
