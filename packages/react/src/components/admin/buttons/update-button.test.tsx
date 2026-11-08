/**
 * `<UpdateButton>` — patches the record in view with fixed data. Undoable by
 * default (cache patched now, Undo notification, server call deferred);
 * `pessimistic` and `optimistic` go through a confirm dialog first.
 *
 * Each test mounts an `<Edit>` route under `<Admin>`. The undoable
 * notification's `undo`/`onClose` callbacks are captured off the store's
 * `notify` spy, so the Undo window is driven deterministically.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
  type NotifyOptions,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { Admin, Edit, Resource, TextInput } from "../../../index";
import { UpdateButton, type UpdateButtonProps } from "./update-button";

afterEach(cleanup);

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

const messages = {
  "chelone.action.update": "Update",
  "chelone.action.confirm": "Confirm",
  "chelone.message.bulk_update_title": "Update this post?",
  "chelone.message.bulk_update_content": "The post will be patched.",
};

function mount({
  button,
  dataProvider = fakeDataProvider({
    posts: [{ id: 1, title: "Alpha", views: 10 }],
  }),
  authProvider,
  extraMessages = {},
}: {
  button: ReactNode;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  extraMessages?: Record<string, string>;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  render(
    <MemoryRouter initialEntries={["/posts/1"]}>
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        queryClient={queryClient}
        notifications={notifications}
        i18n={createI18n({
          locale: "en",
          messages: {
            en: defineMessages({ ...messages, ...extraMessages }),
          },
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
  return { queryClient, notifications, notify };
}

const updateButton = (props: Partial<UpdateButtonProps> = {}) => (
  <UpdateButton data={{ views: 0 }} {...props} />
);

const findUpdate = () => screen.findByRole("button", { name: "Update" });

/** The cached `getOne` record for post 1, whatever id type the page keyed it with. */
function cachedPost(queryClient: QueryClient) {
  const [entry] = queryClient.getQueriesData<{ id: number; views: number }>({
    queryKey: ["posts", "getOne"],
  });
  return entry?.[1];
}

function captureUndoable(
  notify: MockInstance<NotificationStore["notify"]>,
): NotifyOptions {
  const call = notify.mock.calls.find((args) => args[1]?.undoable);
  const options = call?.[1];
  if (!options) throw new Error("no undoable notification was enqueued");
  return options;
}

/** A provider whose `update` stays pending until `settle` is called. */
function deferredUpdate() {
  const dataProvider = fakeDataProvider({
    posts: [{ id: 1, title: "Alpha", views: 10 }],
  });
  let settle: (outcome?: Error) => void = () => {};
  const update = vi.spyOn(dataProvider, "update").mockImplementation(
    (_resource, params) =>
      new Promise((resolve, reject) => {
        settle = (error) =>
          error ? reject(error) : resolve({ data: { id: 1, ...params.data } });
      }),
  );
  return { dataProvider, update, settle: (error?: Error) => settle(error) };
}

describe("<UpdateButton>", () => {
  it("undoable mode patches the record in the cache at once and shows an Undo notification", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const update = vi.spyOn(dataProvider, "update");
    const { queryClient, notify } = mount({
      button: updateButton(),
      dataProvider,
    });

    fireEvent.click(await findUpdate());

    expect(cachedPost(queryClient)?.views).toBe(0);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(captureUndoable(notify).undoable).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("undoable mode defers dataProvider.update until the Undo window closes", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const update = vi.spyOn(dataProvider, "update");
    const { notify } = mount({ button: updateButton(), dataProvider });

    fireEvent.click(await findUpdate());
    expect(update).not.toHaveBeenCalled();

    await act(async () => {
      captureUndoable(notify).onClose?.();
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { views: 0 },
      previousData: { id: 1, title: "Alpha", views: 10 },
    });
  });

  it("undoing restores the record and never calls dataProvider.update", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const update = vi.spyOn(dataProvider, "update");
    const { queryClient, notify } = mount({
      button: updateButton(),
      dataProvider,
    });

    fireEvent.click(await findUpdate());
    expect(cachedPost(queryClient)?.views).toBe(0);

    act(() => {
      captureUndoable(notify).undo?.();
    });

    expect(cachedPost(queryClient)?.views).toBe(10);
    expect(update).not.toHaveBeenCalled();
  });

  it("pessimistic mode asks for confirmation and updates only after confirming", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const update = vi.spyOn(dataProvider, "update");
    mount({
      button: updateButton({ mutationMode: "pessimistic" }),
      dataProvider,
    });

    fireEvent.click(await findUpdate());

    expect(await screen.findByText("Update this post?")).toBeTruthy();
    expect(screen.getByText("The post will be patched.")).toBeTruthy();
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { views: 0 },
      previousData: { id: 1, title: "Alpha", views: 10 },
    });
  });

  it("pessimistic mode keeps the dialog open until the call settles", async () => {
    const { dataProvider, update, settle } = deferredUpdate();
    mount({
      button: updateButton({ mutationMode: "pessimistic" }),
      dataProvider,
    });

    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => settle());

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("optimistic mode closes the dialog on confirm", async () => {
    const { dataProvider, update } = deferredUpdate();
    mount({
      button: updateButton({ mutationMode: "optimistic" }),
      dataProvider,
    });

    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(update).toHaveBeenCalled();
  });

  it("notifies updated on success and an error when the update fails", async () => {
    const ok = mount({
      button: updateButton({ mutationMode: "pessimistic" }),
    });
    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(ok.notify).toHaveBeenCalledWith(
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ),
    );
    cleanup();

    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    vi.spyOn(dataProvider, "update").mockRejectedValue(new Error("boom"));
    const failed = mount({
      button: updateButton({ mutationMode: "pessimistic" }),
      dataProvider,
    });
    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(failed.notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(failed.notify).not.toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.anything(),
    );
  });

  it("passes the result to onSuccess and the error to onError", async () => {
    const onSuccess = vi.fn();
    mount({
      button: updateButton({ mutationMode: "pessimistic", onSuccess }),
    });
    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, views: 0 }),
      ),
    );
    cleanup();

    const onError = vi.fn();
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const error = new Error("boom");
    vi.spyOn(dataProvider, "update").mockRejectedValue(error);
    mount({
      button: updateButton({ mutationMode: "pessimistic", onError }),
      dataProvider,
    });
    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(error));
  });

  it("onSuccess is not called for an undoable update", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { notify } = mount({ button: updateButton({ onSuccess, onError }) });

    fireEvent.click(await findUpdate());
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("the button sends the record id and previousData", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const update = vi.spyOn(dataProvider, "update");
    mount({
      button: updateButton({ mutationMode: "optimistic" }),
      dataProvider,
    });

    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { views: 0 },
      previousData: { id: 1, title: "Alpha", views: 10 },
    });
  });

  it("is disabled while the update is pending", async () => {
    const { dataProvider, update, settle } = deferredUpdate();
    mount({
      button: updateButton({ mutationMode: "optimistic" }),
      dataProvider,
    });

    const button = await findUpdate();
    expect(elementOf(button, HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        elementOf(
          screen.getByRole("button", { name: "Update" }),
          HTMLButtonElement,
        ).disabled,
      ).toBe(true),
    );

    await act(async () => settle());

    await waitFor(() =>
      expect(
        elementOf(
          screen.getByRole("button", { name: "Update" }),
          HTMLButtonElement,
        ).disabled,
      ).toBe(false),
    );
  });

  it("runs onClick after the update is started", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 10 }],
    });
    const update = vi.spyOn(dataProvider, "update");
    const startedWhenClicked = vi.fn();
    // `notify` is assigned once `mount` returns, before any click.
    let notify: MockInstance<NotificationStore["notify"]> | undefined;
    ({ notify } = mount({
      button: updateButton({
        onClick: () =>
          startedWhenClicked(
            notify?.mock.calls.some((args) => args[1]?.undoable),
          ),
      }),
      dataProvider,
    }));

    fireEvent.click(await findUpdate());

    expect(startedWhenClicked).toHaveBeenCalledWith(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("renders nothing without a record id", async () => {
    // Wire-shaped on purpose: a record off the wire can have no id.
    const noId = JSON.parse('{"title":"no id"}');
    mount({
      button: (
        <>
          <UpdateButton data={{ views: 0 }} record={noId} label="No id" />
          <UpdateButton data={{ views: 0 }} label="Has id" />
        </>
      ),
    });

    expect(await screen.findByRole("button", { name: "Has id" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "No id" })).toBeNull();
  });

  it("hides when edit access is denied and shows when access control is unconfigured", async () => {
    mount({
      button: updateButton(),
      authProvider: baseAuth({
        canAccess: async ({ action }) => action !== "edit",
      }),
    });
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
    cleanup();

    mount({ button: updateButton(), authProvider: baseAuth() });
    expect(await findUpdate()).toBeTruthy();
  });

  it("clicking it does not reach a parent click handler", async () => {
    const onParentClick = vi.fn();
    mount({
      button: (
        // biome-ignore lint/a11y/noStaticElementInteractions: stands in for a clickable table row
        // biome-ignore lint/a11y/useKeyWithClickEvents: same
        <div onClick={onParentClick}>
          <UpdateButton data={{ views: 0 }} mutationMode="pessimistic" />
        </div>
      ),
    });

    fireEvent.click(await findUpdate());
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("uses a resource-specific label key before the default", async () => {
    mount({
      button: updateButton(),
      extraMessages: { "resources.posts.action.update": "Reset views" },
    });

    expect(
      await screen.findByRole("button", { name: "Reset views" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
  });
});
