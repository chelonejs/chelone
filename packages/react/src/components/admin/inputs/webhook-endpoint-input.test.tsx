/**
 * P7c-T4 — `<WebhookEndpointInput>` ported onto chelone `useInput` + `ui/field`
 * + `<ValidationError>`. Composite input for `{ url, secret, eventTypes }` with
 * an optional test-ping button.
 */
import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import {
  type WebhookEndpoint,
  WebhookEndpointInput,
} from "./webhook-endpoint-input";

const EVENTS = ["order.created", "order.updated"] as const;

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
  }: {
    defaultValues?: TFormData;
    onData?: (data: TFormData) => void;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
        return undefined;
      },
    });
    submitRef.current = form.submit;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
  return { view, submitRef };
}

const seed: WebhookEndpoint = {
  url: "https://a.test/hook",
  secret: "shh",
  eventTypes: ["order.created"],
};

afterEach(() => cleanup());

describe("<WebhookEndpointInput>", () => {
  it("renders url + secret inputs seeded from the value", () => {
    setup(<WebhookEndpointInput source="endpoint" eventTypes={EVENTS} />, {
      defaultValues: { endpoint: seed },
    });
    expect(
      elementOf(document.querySelector("[data-webhook-url]"), HTMLInputElement)
        .value,
    ).toBe("https://a.test/hook");
    expect(
      elementOf(
        document.querySelector("[data-webhook-secret]"),
        HTMLInputElement,
      ).value,
    ).toBe("shh");
  });

  it("renders a checkbox per event type and reflects subscriptions", () => {
    setup(<WebhookEndpointInput source="endpoint" eventTypes={EVENTS} />, {
      defaultValues: { endpoint: seed },
    });
    const checkboxes = document.querySelectorAll("[data-event-checkbox]");
    expect(checkboxes.length).toBe(2);
    expect(
      elementOf(
        document.querySelector("#webhook-event-order\\.created"),
        HTMLElement,
      ).getAttribute("data-state"),
    ).toBe("checked");
  });

  it("seeds the empty endpoint when a wrapper forwards an undefined defaultValue", async () => {
    const onData = vi.fn();
    // An own `defaultValue` key holding `undefined`, as `defaultValue={props.defaultValue}` passes.
    const forwarded = { defaultValue: undefined };
    const { submitRef } = setup<{ endpoint?: WebhookEndpoint }>(
      <WebhookEndpointInput
        source="endpoint"
        eventTypes={EVENTS}
        {...forwarded}
      />,
      { onData },
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({
      endpoint: { url: "", secret: "", eventTypes: [] },
    });
  });

  it("seeds the empty endpoint when defaultValue is null", async () => {
    const onData = vi.fn();
    const forwarded = { defaultValue: null };
    const { submitRef } = setup<{ endpoint?: WebhookEndpoint }>(
      <WebhookEndpointInput
        source="endpoint"
        eventTypes={EVENTS}
        {...forwarded}
      />,
      { onData },
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({
      endpoint: { url: "", secret: "", eventTypes: [] },
    });
  });

  it("writes the url patch back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ endpoint: WebhookEndpoint }>(
      <WebhookEndpointInput source="endpoint" eventTypes={EVENTS} />,
      { defaultValues: { endpoint: seed }, onData },
    );
    fireEvent.change(
      elementOf(document.querySelector("[data-webhook-url]"), HTMLInputElement),
      { target: { value: "https://b.test/hook" } },
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({
      endpoint: { ...seed, url: "https://b.test/hook" },
    });
  });

  it("toggles an event subscription", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ endpoint: WebhookEndpoint }>(
      <WebhookEndpointInput source="endpoint" eventTypes={EVENTS} />,
      { defaultValues: { endpoint: seed }, onData },
    );
    fireEvent.click(
      elementOf(
        document.querySelector("#webhook-event-order\\.updated"),
        HTMLElement,
      ),
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({
      endpoint: {
        ...seed,
        eventTypes: ["order.created", "order.updated"],
      },
    });
  });

  it("renders the test-ping button and calls onTestPing", async () => {
    const onTestPing = vi.fn().mockResolvedValue(undefined);
    setup(
      <WebhookEndpointInput
        source="endpoint"
        eventTypes={EVENTS}
        onTestPing={onTestPing}
      />,
      { defaultValues: { endpoint: seed } },
    );
    const button = elementOf(
      document.querySelector("[data-test-ping-button]"),
      HTMLButtonElement,
    );
    expect(button).toBeTruthy();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onTestPing).toHaveBeenCalledWith("https://a.test/hook", "shh");
  });

  it("omits the test-ping button when no onTestPing given", () => {
    setup(<WebhookEndpointInput source="endpoint" eventTypes={EVENTS} />, {
      defaultValues: { endpoint: seed },
    });
    expect(document.querySelector("[data-test-ping-button]")).toBeNull();
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ endpoint: WebhookEndpoint | null }>(
      <WebhookEndpointInput
        source="endpoint"
        eventTypes={EVENTS}
        validate={required()}
      />,
      { defaultValues: { endpoint: null } },
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
