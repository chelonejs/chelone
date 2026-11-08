/**
 * P7e-T3 tests: `<Notification>` — the sonner bridge over chelone's
 * notification store.
 *
 * Drains the reactive notification queue (`useNotifications`) into sonner
 * toasts: translates each message KEY via `useTranslate`, renders it, and
 * dismisses it from the store once shown. Asserts a pushed notification
 * surfaces its translated text, and that translation runs (key -> message).
 */

import {
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
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
import { act } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { Notification } from "./notification";

afterEach(() => {
  cleanup();
  // Sonner's store is module-global and replays active toasts to a new Toaster.
  toast.dismiss();
});

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.notification.created": "Element created",
        "chelone.notification.deleted": "Element deleted",
        "chelone.action.undo": "Undo",
      }),
    },
  });
}

function Wrap({
  notifications,
  children,
}: {
  notifications: NotificationStore;
  children: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n()}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<Notification>", () => {
  it("renders a pushed notification's translated message", async () => {
    const notifications = createNotificationStore();
    render(
      <Wrap notifications={notifications}>
        <Notification />
      </Wrap>,
    );
    act(() => {
      notifications.notify("chelone.notification.created", { type: "success" });
    });
    // The KEY is translated to its message before it is shown.
    expect(await screen.findByText("Element created")).toBeTruthy();
  });

  it("dismisses the notification from the store once shown", async () => {
    const notifications = createNotificationStore();
    render(
      <Wrap notifications={notifications}>
        <Notification />
      </Wrap>,
    );
    act(() => {
      notifications.notify("chelone.notification.created", { type: "success" });
    });
    await screen.findByText("Element created");
    // The store queue is drained (the toast owns the lifecycle now).
    await waitFor(() => expect(notifications.getSnapshot().length).toBe(0));
  });

  it("mounts the sonner toaster region once a notification fires", async () => {
    const notifications = createNotificationStore();
    const { container } = render(
      <Wrap notifications={notifications}>
        <Notification />
      </Wrap>,
    );
    // Sonner lazily mounts its `[data-sonner-toaster]` region on the first toast.
    expect(container.querySelector("[data-sonner-toaster]")).toBeNull();
    act(() => {
      notifications.notify("chelone.notification.created", { type: "info" });
    });
    await waitFor(() =>
      expect(document.querySelector("[data-sonner-toaster]")).toBeTruthy(),
    );
  });

  it("renders an Undo action for an undoable notification", async () => {
    const notifications = createNotificationStore();
    render(
      <Wrap notifications={notifications}>
        <Notification />
      </Wrap>,
    );
    act(() => {
      notifications.notify("chelone.notification.deleted", {
        type: "info",
        undoable: true,
        autoHideDuration: 5000,
        undo: () => {},
        onClose: () => {},
      });
    });
    await screen.findByText("Element deleted");
    expect(screen.getByRole("button", { name: /undo/i })).toBeTruthy();
  });

  it("clicking Undo calls undo() and not onClose()", async () => {
    const notifications = createNotificationStore();
    const undo = vi.fn();
    const onClose = vi.fn();
    render(
      <Wrap notifications={notifications}>
        <Notification />
      </Wrap>,
    );
    act(() => {
      notifications.notify("chelone.notification.deleted", {
        type: "info",
        undoable: true,
        autoHideDuration: 5000,
        undo,
        onClose,
      });
    });
    const undoButton = await screen.findByRole("button", { name: /undo/i });
    fireEvent.click(undoButton);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismissing the toast (close button) commits via onClose()", async () => {
    const notifications = createNotificationStore();
    const undo = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <Wrap notifications={notifications}>
        <Notification />
      </Wrap>,
    );
    act(() => {
      notifications.notify("chelone.notification.deleted", {
        type: "info",
        undoable: true,
        autoHideDuration: 5000,
        undo,
        onClose,
      });
    });
    await screen.findByText("Element deleted");
    const closeButton = elementOf(
      container.ownerDocument.querySelector("[data-close-button]"),
      HTMLElement,
    );
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(undo).not.toHaveBeenCalled();
  });
});
