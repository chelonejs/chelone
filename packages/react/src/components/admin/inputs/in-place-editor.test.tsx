/**
 * `<InPlaceEditor>` — shows a record value, turns it into an input on click and
 * saves the change with `update`.
 *
 * Each test mounts a `<Show>` route under `<Admin>`, so the record comes from
 * the data provider as it does on a real show page. `update` is a spy on the
 * data provider, and notifications are read off a spy on the store.
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
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Admin,
  DataTable,
  List,
  Resource,
  Show,
  TextField,
  TextInput,
} from "../../../index";
import { InPlaceEditor } from "./in-place-editor";

afterEach(cleanup);

const messages = {
  "chelone.action.edit": "Edit",
  "chelone.action.save": "Save",
  "chelone.action.cancel": "Cancel",
};

const seed = () => ({ posts: [{ id: 1, title: "Alpha", views: 10 }] });

/** A promise the test settles by hand, to hold an `update` in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mount({
  editor = <InPlaceEditor source="title" />,
  inList,
  seedData = seed(),
  gate,
  fail,
  authProvider,
}: {
  editor?: React.ReactNode;
  /** Mounts a `<DataTable>` list whose row click opens the show page, instead of the show page. */
  inList?: boolean;
  seedData?: ReturnType<typeof seed>;
  /** Holds `update` until this settles. */
  gate?: Promise<void>;
  /** Rejects `update` with this. */
  fail?: Error;
  authProvider?: AuthProvider;
} = {}) {
  const base = fakeDataProvider(seedData);
  // The fake updates its stored row in place, which a record the page holds can alias, so the arguments are read as they were at call time.
  const updates: Array<Parameters<DataProvider["update"]>[1]> = [];
  const dataProvider: DataProvider = {
    ...base,
    update: vi.fn(async (resource, params) => {
      updates.push(structuredClone(params));
      await gate;
      if (fail) throw fail;
      return base.update(resource, params);
    }),
  };
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  render(
    <MemoryRouter initialEntries={[inList ? "/posts" : "/posts/1"]}>
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
          messages: { en: defineMessages(messages) },
        })}
      >
        <Resource
          name="posts"
          list={() => (
            <List>
              <DataTable rowClick="show">
                <DataTable.Col source="id" />
                <DataTable.Col label="Title">{editor}</DataTable.Col>
              </DataTable>
            </List>
          )}
          show={() => <Show title={false}>{editor}</Show>}
        />
      </Admin>
    </MemoryRouter>,
  );
  return { dataProvider, notify, updates };
}

const findReading = () => screen.findByRole("button", { name: "Edit" });

/**
 * Types `value` into the input and submits its form. jsdom has no implicit
 * submission, so the Enter a user presses is the form's `submit` here.
 */
function changeAndSubmit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  submit(input);
}

function submit(input: HTMLElement) {
  const form = input.closest("form");
  if (!form) throw new Error("the input is not in a form");
  fireEvent.submit(form);
}

/** Starts editing and returns the input, once it is on screen. */
async function startEditing() {
  fireEvent.click(await findReading());
  return screen.findByRole("textbox");
}

describe("<InPlaceEditor>", () => {
  it("shows the record value as a button labelled Edit", async () => {
    mount();

    const reading = await findReading();

    expect(reading.textContent).toBe("Alpha");
    expect(reading.tabIndex).toBe(0);
    expect(reading.dataset.slot).toBe("in-place-editor-reading");
    expect(reading.closest("[data-slot=in-place-editor]")).not.toBeNull();
  });

  it("a click or Enter swaps in the input holding the current value", async () => {
    mount();

    const afterClick = await startEditing();
    expect(afterClick).toHaveProperty("value", "Alpha");
    expect(afterClick.closest("form")?.dataset.slot).toBe(
      "in-place-editor-editing",
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();

    fireEvent.keyDown(afterClick, { key: "Escape" });
    fireEvent.keyDown(await findReading(), { key: "Enter" });
    expect(await screen.findByRole("textbox")).toHaveProperty("value", "Alpha");

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    fireEvent.keyDown(await findReading(), { key: " " });
    expect(await screen.findByRole("textbox")).toHaveProperty("value", "Alpha");
  });

  it("Enter after a change calls update with only the changed field and the record as previousData", async () => {
    const { dataProvider, updates } = mount();

    changeAndSubmit(await startEditing(), "Beta");

    await waitFor(() => expect(dataProvider.update).toHaveBeenCalledTimes(1));
    expect(updates).toEqual([
      {
        id: 1,
        data: { title: "Beta" },
        previousData: { id: 1, title: "Alpha", views: 10 },
      },
    ]);
    expect((await findReading()).textContent).toBe("Beta");
  });

  it("sends meta with the update", async () => {
    const { dataProvider } = mount({
      editor: <InPlaceEditor source="title" meta={{ reason: "typo" }} />,
    });

    changeAndSubmit(await startEditing(), "Beta");

    await waitFor(() =>
      expect(dataProvider.update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ meta: { reason: "typo" } }),
      ),
    );
  });

  it("Enter with no change calls nothing and returns to reading", async () => {
    const { dataProvider } = mount();

    submit(await startEditing());

    expect((await findReading()).textContent).toBe("Alpha");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(dataProvider.update).not.toHaveBeenCalled();
  });

  it("Escape cancels and calls nothing", async () => {
    const { dataProvider } = mount();
    const input = await startEditing();
    fireEvent.change(input, { target: { value: "Beta" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect((await findReading()).textContent).toBe("Alpha");
    expect(dataProvider.update).not.toHaveBeenCalled();
  });

  it("a blur cancels by default and submits with cancelOnBlur false", async () => {
    const first = mount();
    const input = await startEditing();
    fireEvent.change(input, { target: { value: "Beta" } });

    fireEvent.focusOut(input, { relatedTarget: null });

    expect((await findReading()).textContent).toBe("Alpha");
    expect(first.dataProvider.update).not.toHaveBeenCalled();
    cleanup();

    const second = mount({
      editor: <InPlaceEditor source="title" cancelOnBlur={false} />,
    });
    const again = await startEditing();
    fireEvent.change(again, { target: { value: "Beta" } });

    fireEvent.focusOut(again, { relatedTarget: document.body });

    await waitFor(() =>
      expect(second.dataProvider.update).toHaveBeenCalledTimes(1),
    );
    expect((await findReading()).textContent).toBe("Beta");
  });

  it("a blur onto another element inside the editor does nothing", async () => {
    const { dataProvider } = mount({
      editor: <InPlaceEditor source="title" showButtons />,
    });
    const input = await startEditing();
    fireEvent.change(input, { target: { value: "Beta" } });

    fireEvent.focusOut(input, {
      relatedTarget: screen.getByRole("button", { name: "Save" }),
    });

    expect(screen.getByRole("textbox")).toHaveProperty("value", "Beta");
    expect(dataProvider.update).not.toHaveBeenCalled();
  });

  it("showButtons saves with the Save button and cancels with the Cancel button", async () => {
    const { dataProvider } = mount({
      editor: <InPlaceEditor source="title" showButtons />,
    });
    const input = await startEditing();
    fireEvent.change(input, { target: { value: "Beta" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(dataProvider.update).toHaveBeenCalledTimes(1));
    expect((await findReading()).textContent).toBe("Beta");

    const second = await startEditing();
    fireEvent.change(second, { target: { value: "Gamma" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect((await findReading()).textContent).toBe("Beta");
    expect(dataProvider.update).toHaveBeenCalledTimes(1);
  });

  it("shows no buttons by default", async () => {
    mount();
    await startEditing();

    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("shows the new value as busy until a pessimistic update answers", async () => {
    const pending = deferred<void>();
    const { dataProvider } = mount({ gate: pending.promise });

    changeAndSubmit(await startEditing(), "Beta");

    const saving = await waitFor(() => {
      const found = document.querySelector(
        "[data-slot=in-place-editor-saving]",
      );
      if (!found) throw new Error("not saving yet");
      return found;
    });
    expect(saving.getAttribute("aria-busy")).toBe("true");
    expect(saving.textContent).toBe("Beta");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(dataProvider.update).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
    });

    expect((await findReading()).textContent).toBe("Beta");
    expect(
      document.querySelector("[data-slot=in-place-editor-saving]"),
    ).toBeNull();
  });

  it("a rejected update returns to the old value, notifies an error and calls onError", async () => {
    const failure = new Error("server down");
    const onError = vi.fn();
    const { notify } = mount({
      editor: <InPlaceEditor source="title" onError={onError} />,
      fail: failure,
    });

    changeAndSubmit(await startEditing(), "Beta");

    expect((await findReading()).textContent).toBe("Alpha");
    expect(notify).toHaveBeenCalledWith("chelone.notification.http_error", {
      type: "error",
    });
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("notifyOnSuccess notifies once, and a success calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const { notify } = mount({
      editor: (
        <InPlaceEditor source="title" notifyOnSuccess onSuccess={onSuccess} />
      ),
    });

    changeAndSubmit(await startEditing(), "Beta");

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, title: "Beta", views: 10 });
    const updated = notify.mock.calls.filter(
      ([message]) => message === "chelone.notification.updated",
    );
    expect(updated).toEqual([
      [
        "chelone.notification.updated",
        expect.objectContaining({ type: "info" }),
      ],
    ]);
  });

  it("notifies nothing on success by default", async () => {
    const { notify } = mount();

    changeAndSubmit(await startEditing(), "Beta");

    expect((await findReading()).textContent).toBe("Beta");
    expect(notify).not.toHaveBeenCalled();
  });

  it("an undoable update notifies once, with Undo, whatever notifyOnSuccess says", async () => {
    const { notify } = mount({
      editor: (
        <InPlaceEditor source="title" mutationMode="undoable" notifyOnSuccess />
      ),
    });

    changeAndSubmit(await startEditing(), "Beta");

    expect((await findReading()).textContent).toBe("Beta");
    expect(
      notify.mock.calls.filter(
        ([message]) => message === "chelone.notification.updated",
      ),
    ).toEqual([
      [
        "chelone.notification.updated",
        expect.objectContaining({ undoable: true }),
      ],
    ]);
  });

  it("a failed undoable update notifies one error and calls onError", async () => {
    const failure = new Error("server down");
    const onError = vi.fn();
    const { notify } = mount({
      editor: (
        <InPlaceEditor
          source="title"
          mutationMode="undoable"
          onError={onError}
        />
      ),
      fail: failure,
    });

    changeAndSubmit(await startEditing(), "Beta");
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    // Closing the Undo notification is what sends the deferred update.
    const [, options] = notify.mock.calls[0] ?? [];
    await act(async () => {
      options?.onClose?.();
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
    expect(
      notify.mock.calls.filter(
        ([message]) => message === "chelone.notification.http_error",
      ),
    ).toHaveLength(1);
  });

  it("without edit access the value shows and cannot be clicked", async () => {
    const denied = {
      login: async () => {},
      logout: async () => {},
      checkAuth: async () => {},
      checkError: async () => {},
      canAccess: async () => false,
    };
    mount({ authProvider: denied });

    const value = await screen.findByText("Alpha");
    fireEvent.click(value);

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(value.textContent).toBe("Alpha");
  });

  it("while access is pending the value shows and cannot be clicked", async () => {
    const pending = {
      login: async () => {},
      logout: async () => {},
      checkAuth: async () => {},
      checkError: async () => {},
      canAccess: () => new Promise<boolean>(() => {}),
    };
    mount({ authProvider: pending });

    const value = await screen.findByText("Alpha");
    fireEvent.click(value);

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("a click inside a DataTable row does not fire the row click", async () => {
    mount({ inList: true });

    const input = await startEditing();
    fireEvent.click(input);

    expect(screen.getByRole("table")).toBeDefined();
    fireEvent.click(screen.getByText("1"));
    await waitFor(() => expect(screen.queryByRole("table")).toBeNull());
  });

  it("children and editor replace the default field and input", async () => {
    const { dataProvider } = mount({
      editor: (
        <InPlaceEditor
          editor={<TextInput source="views" label={false} autoFocus />}
        >
          <TextField source="views" />
        </InPlaceEditor>
      ),
    });

    const input = await startEditing();
    expect(input).toHaveProperty("value", "10");

    changeAndSubmit(input, "11");

    await waitFor(() =>
      expect(dataProvider.update).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ data: { views: "11" } }),
      ),
    );
  });

  it("throws an error naming the missing props", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<InPlaceEditor />)).toThrow(
        /`source`.*`children`.*`editor`/,
      );
      expect(() => render(<InPlaceEditor>text</InPlaceEditor>)).toThrow(
        /`source`.*`editor`/,
      );
    } finally {
      quiet.mockRestore();
    }
  });

  it("renders a value that holds markup as text", async () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const pending = deferred<void>();
    mount({
      seedData: { posts: [{ id: 1, title: img, views: 10 }] },
      gate: pending.promise,
    });
    const noMarkup = () =>
      expect(document.body.querySelector("img, script")).toBeNull();

    const reading = await findReading();
    expect(reading.textContent).toBe(img);
    noMarkup();

    fireEvent.click(reading);
    const input = await screen.findByRole("textbox");
    expect(input).toHaveProperty("value", img);
    noMarkup();

    changeAndSubmit(input, script);
    const saving = await waitFor(() => {
      const found = document.querySelector(
        "[data-slot=in-place-editor-saving]",
      );
      if (!found) throw new Error("not saving yet");
      return found;
    });
    expect(saving.textContent).toBe(script);
    noMarkup();

    await act(async () => {
      pending.resolve();
    });
    expect((await findReading()).textContent).toBe(script);
    noMarkup();
  });
});
