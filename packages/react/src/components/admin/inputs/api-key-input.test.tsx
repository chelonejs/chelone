/**
 * P7c-T4 — `<ApiKeyInput>` ported onto @chelone/react. NOT form-bound: it is a
 * direct-mutation control reading `useRecordContext` + `useResourceContext` and
 * dispatching chelone's `useUpdate(resource).mutateAsync({ id, data,
 * previousData })` (ra-core's `useUpdate()` tuple → TanStack mutation object).
 * Renders a Rotate button that opens a confirm dialog; on confirm it calls
 * `onRotate(record)` if provided, else the default update mutation.
 */
import { fakeDataProvider } from "@chelone/core";
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceContextProvider } from "../../../resource";
import { ApiKeyInput } from "./api-key-input";

interface Account extends Record<string, unknown> {
  id: number;
  apiKey: string | null;
}

function setup(
  ui: ReactNode,
  {
    record,
    resource = "accounts",
    data = { accounts: [{ id: 1, apiKey: "sk_live_abc" }] },
    update,
  }: {
    record?: Account;
    resource?: string;
    data?: { accounts: Account[] };
    update?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const base = fakeDataProvider(data);
  const dataProvider = update
    ? { ...base, update: update as typeof base.update }
    : base;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
    >
      <ResourceContextProvider value={resource}>
        {record ? (
          <RecordContextProvider value={record}>
            {children}
          </RecordContextProvider>
        ) : (
          children
        )}
      </ResourceContextProvider>
    </CheloneProvider>
  );
  return { view: render(<Wrapper>{ui}</Wrapper>), dataProvider };
}

afterEach(() => cleanup());

describe("<ApiKeyInput>", () => {
  it("renders a Rotate button", () => {
    setup(<ApiKeyInput source="apiKey" />, {
      record: { id: 1, apiKey: "sk_live_abc" },
    });
    expect(document.querySelector("[data-rotate-button]")).toBeTruthy();
  });

  it("opens a confirmation dialog on click", async () => {
    setup(<ApiKeyInput source="apiKey" />, {
      record: { id: 1, apiKey: "sk_live_abc" },
    });
    await act(async () => {
      fireEvent.click(
        document.querySelector("[data-rotate-button]") as HTMLElement,
      );
    });
    expect(screen.getByText("Rotate API key?")).toBeTruthy();
  });

  it("calls onRotate with the record on confirm when provided", async () => {
    const onRotate = vi.fn().mockResolvedValue(undefined);
    const record = { id: 1, apiKey: "sk_live_abc" };
    setup(<ApiKeyInput source="apiKey" onRotate={onRotate} />, { record });
    await act(async () => {
      fireEvent.click(
        document.querySelector("[data-rotate-button]") as HTMLElement,
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Rotate$/ }));
    });
    await waitFor(() => expect(onRotate).toHaveBeenCalledWith(record));
  });

  it("dispatches the default update mutation (id + nulled source) on confirm", async () => {
    const update = vi.fn().mockResolvedValue({ data: { id: 1, apiKey: null } });
    setup(<ApiKeyInput source="apiKey" />, {
      record: { id: 1, apiKey: "sk_live_abc" },
      update,
    });
    await act(async () => {
      fireEvent.click(
        document.querySelector("[data-rotate-button]") as HTMLElement,
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Rotate$/ }));
    });
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "accounts",
        expect.objectContaining({
          id: 1,
          data: { apiKey: null },
          previousData: { id: 1, apiKey: "sk_live_abc" },
        }),
      ),
    );
  });

  it("respects the disabled prop", () => {
    setup(<ApiKeyInput source="apiKey" disabled />, {
      record: { id: 1, apiKey: "sk_live_abc" },
    });
    const button = document.querySelector(
      "[data-rotate-button]",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
