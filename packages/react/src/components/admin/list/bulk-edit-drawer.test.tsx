/**
 * `<BulkEditDrawer>` — types new values for the selected rows in a side sheet
 * and sends only the touched fields to `updateMany`.
 *
 * Each test mounts a `<List>` with row selection under `<Admin>`. The drawer
 * sits in the list `actions` slot, not the bulk toolbar, so it exists (disabled)
 * before any row is selected.
 */

import {
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
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Admin,
  DataTable,
  List,
  NumberInput,
  Resource,
  TextInput,
} from "../../../index";
import { BulkEditDrawer, type BulkEditDrawerProps } from "./bulk-edit-drawer";

afterEach(cleanup);

const seed = () => ({
  posts: [
    { id: 1, title: "Alpha", views: 10 },
    { id: 2, title: "Beta", views: 20 },
    { id: 3, title: "Gamma", views: 30 },
  ],
});

function mount({
  dataProvider = fakeDataProvider(seed()),
  messages = {},
  inputs,
  ...drawerProps
}: Partial<BulkEditDrawerProps> & {
  dataProvider?: DataProvider;
  inputs?: ReactNode;
  messages?: Record<string, string | { one?: string; other: string }>;
} = {}) {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={dataProvider}
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
          messages: { en: defineMessages({ ...messages }) },
        })}
      >
        <Resource
          name="posts"
          list={() => (
            <List
              actions={
                <BulkEditDrawer {...drawerProps}>
                  {inputs ?? (
                    <>
                      <TextInput source="title" />
                      <NumberInput source="views" />
                      <TextInput source="status" defaultValue="draft" />
                    </>
                  )}
                </BulkEditDrawer>
              }
            >
              <DataTable bulkActionButtons={<span />}>
                <DataTable.Col source="title" />
              </DataTable>
            </List>
          )}
        />
      </Admin>
    </MemoryRouter>,
  );
  return { dataProvider, notify };
}

/** Ticks the checkbox of each row (by position) once the list has loaded. */
async function selectRows(...positions: number[]) {
  await screen.findByText("Alpha");
  const boxes = screen.getAllByLabelText("Select row");
  for (const position of positions) {
    const box = boxes[position];
    if (!box) throw new Error(`no row at position ${position}`);
    fireEvent.click(box);
  }
}

const findTrigger = () =>
  waitFor(() => {
    const trigger = document.querySelector("[data-bulk-edit-trigger]");
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error("trigger not rendered");
    }
    return trigger;
  });

describe("<BulkEditDrawer>", () => {
  it("the trigger is disabled with no selection and shows the count with one", async () => {
    mount();
    const trigger = await findTrigger();
    expect(trigger.disabled).toBe(true);

    await selectRows(0);

    await waitFor(() => expect(trigger.disabled).toBe(false));
    expect(trigger.textContent).toContain("Edit selected");
    expect(trigger.textContent).toContain("1");
  });

  it("applying sends only the touched fields to updateMany for every selected id", async () => {
    const { dataProvider } = mount();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await selectRows(0, 2);

    fireEvent.click(await findTrigger());
    fireEvent.change(await screen.findByLabelText(/title/i), {
      target: { value: "Renamed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^apply/i }));

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    expect(updateMany).toHaveBeenCalledWith("posts", {
      ids: [1, 3],
      data: { title: "Renamed" },
    });
  });

  it("applying with no touched field closes the sheet without calling updateMany", async () => {
    const { dataProvider, notify } = mount();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await selectRows(0);

    fireEvent.click(await findTrigger());
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /^apply/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(updateMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("success notifies, clears the selection, refreshes the list and calls onSuccess with the diff and ids", async () => {
    const onSuccess = vi.fn();
    const { dataProvider, notify } = mount({ onSuccess });
    const getList = vi.spyOn(dataProvider, "getList");
    await selectRows(0, 1);
    const trigger = await findTrigger();
    const listCallsBefore = getList.mock.calls.length;

    fireEvent.click(trigger);
    fireEvent.change(await screen.findByLabelText(/views/i), {
      target: { value: "99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^apply/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ views: 99 }, [1, 2]);
    expect(notify).toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.objectContaining({
        type: "info",
        messageArgs: { smart_count: 2 },
      }),
    );
    // Selection cleared: nothing left to edit.
    await waitFor(() => expect(trigger.disabled).toBe(true));
    // Sheet closed.
    expect(screen.queryByRole("dialog")).toBeNull();
    // List refetched.
    await waitFor(() =>
      expect(getList.mock.calls.length).toBeGreaterThan(listCallsBefore),
    );
    // The rows hold the new value.
    const { data } = await dataProvider.getMany("posts", { ids: [1, 2, 3] });
    expect(data.map((r) => r.views)).toEqual([99, 99, 30]);
  });

  it("a failed updateMany notifies an error and keeps the sheet open with the typed values", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onSuccess = vi.fn();
    const { dataProvider, notify } = mount({ onSuccess });
    vi.spyOn(dataProvider, "updateMany").mockRejectedValue(new Error("boom"));
    await selectRows(0);

    fireEvent.click(await findTrigger());
    const input = await screen.findByLabelText(/title/i);
    fireEvent.change(input, { target: { value: "Typed" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply/i }));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
    ).toBe("Typed");
    expect(onSuccess).not.toHaveBeenCalled();
    // Selection survives so the user can retry.
    expect((await findTrigger()).disabled).toBe(false);
    consoleError.mockRestore();
  });

  it("disables Apply while updateMany is pending", async () => {
    const { dataProvider } = mount();
    let release: () => void = () => {};
    vi.spyOn(dataProvider, "updateMany").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: [1] });
        }),
    );
    await selectRows(0);

    fireEvent.click(await findTrigger());
    fireEvent.change(await screen.findByLabelText(/title/i), {
      target: { value: "Slow" },
    });
    const apply = elementOf(
      screen.getByRole("button", { name: /^apply/i }),
      HTMLButtonElement,
    );
    fireEvent.click(apply);

    await waitFor(() => expect(apply.disabled).toBe(true));
    release();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("cancel resets the form so a reopened sheet starts empty", async () => {
    mount();
    await selectRows(0);

    fireEvent.click(await findTrigger());
    fireEvent.change(await screen.findByLabelText(/title/i), {
      target: { value: "Discard me" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(await findTrigger());
    const reopened = await screen.findByLabelText(/title/i);
    expect(elementOf(reopened, HTMLInputElement).value).toBe("");
  });

  it("escape resets the form like cancel", async () => {
    const { dataProvider } = mount();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await selectRows(0);

    fireEvent.click(await findTrigger());
    fireEvent.change(await screen.findByLabelText(/title/i), {
      target: { value: "Discard me" },
    });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(await findTrigger());
    const reopened = await screen.findByLabelText(/title/i);
    expect(elementOf(reopened, HTMLInputElement).value).toBe("");
    // The discarded edit is not sent either.
    fireEvent.click(screen.getByRole("button", { name: /^apply/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("the description pluralises with the selection size", async () => {
    mount({
      messages: {
        "chelone.message.bulk_edit_description": {
          one: "Changes {smart_count} record.",
          other: "Changes {smart_count} records.",
        },
      },
    });
    await selectRows(0);
    fireEvent.click(await findTrigger());
    await screen.findByText("Changes 1 record.");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await selectRows(1);
    fireEvent.click(await findTrigger());
    await screen.findByText("Changes 2 records.");
  });

  it("label, title and side props change the trigger, the heading and the sheet edge", async () => {
    mount({ label: "Mass edit", title: "Edit many posts", side: "left" });
    await selectRows(0);

    const trigger = await findTrigger();
    expect(trigger.textContent).toContain("Mass edit");
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("data-side")).toBe("left");
    expect(
      screen.getByRole("heading", { name: "Edit many posts" }),
    ).toBeTruthy();
  });

  it("a nested source is refused with an error instead of overwriting the stored object", async () => {
    const dataProvider = fakeDataProvider({
      posts: [
        { id: 1, title: "Alpha", address: { city: "Paris", zip: "75001" } },
        { id: 2, title: "Beta", address: { city: "Nice", zip: "06000" } },
      ],
    });
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    const { notify } = mount({
      dataProvider,
      inputs: <TextInput source="address.city" />,
    });
    await selectRows(0, 1);

    fireEvent.click(await findTrigger());
    fireEvent.change(await screen.findByLabelText(/city/i), {
      target: { value: "Lyon" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^apply/i }));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.message.bulk_edit_nested_source",
        expect.objectContaining({
          type: "error",
          messageArgs: expect.objectContaining({ source: "address.city" }),
        }),
      ),
    );
    expect(updateMany).not.toHaveBeenCalled();
    // The sheet stays open with the typed value, and the selection survives.
    expect(
      elementOf(screen.getByLabelText(/city/i), HTMLInputElement).value,
    ).toBe("Lyon");
    expect((await findTrigger()).disabled).toBe(false);
  });
});
