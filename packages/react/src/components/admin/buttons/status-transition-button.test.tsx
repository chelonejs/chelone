/**
 * `<StatusTransitionButton>` — a menu of the states the record may move to.
 * Each test mounts an `<Edit>` route under `<Admin>` and asserts the DOM and
 * the `dataProvider.update` calls.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin, Edit, Resource, TextInput } from "../../../index";
import {
  StatusTransitionButton,
  type StatusTransitionButtonProps,
} from "./status-transition-button";

// Radix DropdownMenu opens on `pointerdown`; jsdom has no `PointerEvent`.
if (typeof globalThis.PointerEvent === "undefined") {
  vi.stubGlobal("PointerEvent", MouseEvent);
}

afterEach(cleanup);

type Post = Record<string, unknown> & { id: number };

const post = (over: Partial<Post> = {}): Post => ({
  id: 1,
  title: "Alpha",
  status: "draft",
  ...over,
});

const transitions = {
  draft: ["review", "archived"],
  review: ["published", "draft"],
};

function mount({
  props = {},
  record = post(),
  authProvider,
  dataProvider = fakeDataProvider({ posts: [record] }),
}: {
  props?: Partial<StatusTransitionButtonProps>;
  record?: Post;
  authProvider?: AuthProvider;
  dataProvider?: DataProvider;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
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
          messages: {
            en: defineMessages({
              "chelone.action.cancel": "Cancel",
              "chelone.action.confirm": "Confirm",
            }),
          },
        })}
      >
        <Resource
          name="posts"
          edit={() => (
            <Edit
              actions={
                <StatusTransitionButton transitions={transitions} {...props} />
              }
            >
              <TextInput source="title" />
            </Edit>
          )}
        />
      </Admin>
    </MemoryRouter>,
  );
  return { notify, dataProvider };
}

const trigger = () => screen.findByRole("button", { name: /^(draft|-)$/i });

/** Open a Radix menu trigger the way a mouse would (pointerdown + click). */
async function openMenu() {
  const button = await trigger();
  fireEvent.pointerDown(
    button,
    new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
  );
  fireEvent.pointerUp(
    button,
    new MouseEvent("pointerup", { bubbles: true, button: 0 }),
  );
  fireEvent.click(button);
}

describe("StatusTransitionButton", () => {
  it("shows the current status on the trigger", async () => {
    mount();

    const button = await trigger();
    expect(button.getAttribute("data-slot")).toBe("status-transition-trigger");
    expect(button.textContent).toBe("draft");
    expect(elementOf(button, HTMLButtonElement).disabled).toBe(false);
  });

  it("lists the allowed next states in the menu", async () => {
    mount();

    await openMenu();

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "review",
      "archived",
    ]);
  });

  it("drops a state whose guard returns false", async () => {
    mount({ props: { guards: { "draft->archived": () => false } } });

    await openMenu();

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["review"]);
  });

  it("disables the trigger when no transition is allowed", async () => {
    mount({ record: post({ status: "archived" }) });

    const button = await screen.findByRole("button", { name: "archived" });
    expect(elementOf(button, HTMLButtonElement).disabled).toBe(true);
  });

  it("updates the record with the chosen state and previousData", async () => {
    const dataProvider = fakeDataProvider({ posts: [post()] });
    const update = vi.spyOn(dataProvider, "update");
    const { notify } = mount({ dataProvider, props: { source: "status" } });

    await openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "review" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { status: "review" },
      previousData: post(),
    });
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ),
    );
  });

  it("asks for confirmation first with confirm and updates nothing on cancel", async () => {
    const dataProvider = fakeDataProvider({ posts: [post()] });
    const update = vi.spyOn(dataProvider, "update");
    mount({ dataProvider, props: { confirm: true } });

    await openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "review" }));

    expect(await screen.findByText("Change status?")).toBeTruthy();
    expect(screen.getByText("Move to review?")).toBeTruthy();
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(update).not.toHaveBeenCalled();

    await openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "review" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].data).toEqual({ status: "review" });
  });

  it("calls onTransition after the update resolves and not when it fails", async () => {
    const dataProvider = fakeDataProvider({ posts: [post()] });
    let settle: (error?: Error) => void = () => {};
    vi.spyOn(dataProvider, "update").mockImplementation(
      (_resource, params) =>
        new Promise((resolve, reject) => {
          settle = (error) =>
            error
              ? reject(error)
              : resolve({ data: { id: 1, ...params.data } });
        }),
    );
    const onTransition = vi.fn();
    const { notify } = mount({ dataProvider, props: { onTransition } });

    await openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "review" }));
    await waitFor(() =>
      expect(
        elementOf(screen.getByRole("button"), HTMLButtonElement).disabled,
      ).toBe(true),
    );
    expect(onTransition).not.toHaveBeenCalled();

    settle(new Error("refused"));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(onTransition).not.toHaveBeenCalled();
    expect((await trigger()).textContent).toBe("draft");

    await openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "review" }));
    await waitFor(() => expect(notify).toHaveBeenCalled());
    settle();
    await waitFor(() => expect(onTransition).toHaveBeenCalledTimes(1));
    expect(onTransition).toHaveBeenCalledWith("draft", "review", post());
  });

  it("shows a mapped label and an unmapped raw state", async () => {
    mount({ props: { labels: { draft: "Draft", review: "In review" } } });

    const button = await screen.findByRole("button", { name: "Draft" });
    expect(button.textContent).toBe("Draft");
    await openMenu();

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "In review",
      "archived",
    ]);
  });

  it("shows a hyphen on the trigger when the state is empty", async () => {
    mount({ record: post({ status: "" }) });

    const button = await screen.findByRole("button", { name: "-" });
    expect(button.textContent).toBe("-");
    expect(elementOf(button, HTMLButtonElement).disabled).toBe(true);
  });

  it("renders nothing without a record or edit access", async () => {
    const canAccess = vi.fn(async () => false);
    mount({
      authProvider: {
        login: async () => {},
        logout: async () => {},
        checkAuth: async () => {},
        checkError: async () => {},
        canAccess,
      },
    });

    await waitFor(() => expect(canAccess).toHaveBeenCalled());
    await screen.findByLabelText(/title/i);
    expect(screen.queryByRole("button", { name: "draft" })).toBeNull();

    cleanup();
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={fakeDataProvider({ posts: [post()] })}
          queryClient={new QueryClient()}
          notifications={createNotificationStore()}
        >
          <Resource
            name="posts"
            list={() => (
              <div>
                <p>No record in view</p>
                <StatusTransitionButton
                  resource="posts"
                  transitions={transitions}
                />
              </div>
            )}
          />
        </Admin>
      </MemoryRouter>,
    );

    await screen.findByText("No record in view");
    expect(screen.queryByRole("button", { name: /draft|-/ })).toBeNull();
    expect(
      document.querySelector('[data-slot="status-transition-trigger"]'),
    ).toBeNull();
  });

  it("in undoable mode queues an Undo notification and calls onTransition without calling the server", async () => {
    const dataProvider = fakeDataProvider({ posts: [post()] });
    const update = vi.spyOn(dataProvider, "update");
    const onTransition = vi.fn();
    const { notify } = mount({
      dataProvider,
      props: { mutationMode: "undoable", onTransition },
    });

    await openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "review" }));

    await waitFor(() => expect(onTransition).toHaveBeenCalledTimes(1));
    expect(notify.mock.calls.some(([, options]) => options?.undoable)).toBe(
      true,
    );
    expect(update).not.toHaveBeenCalled();
  });
});
