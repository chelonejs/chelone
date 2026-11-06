/**
 * P7d-T2 tests: `<PhoneField>` — E.164 phone → formatted label / tel: link.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { PhoneField } from "./phone-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "—" }) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
}

describe("<PhoneField />", () => {
  it("renders a tel: link with national format for a US number", () => {
    const { container, getByText } = render(<PhoneField source="phone" />, {
      wrapper: wrap({ id: 1, phone: "+14155552671" }),
    });
    const link = elementOf(container.querySelector("a"), HTMLAnchorElement);
    expect(link.getAttribute("href")).toBe("tel:+14155552671");
    expect(getByText(/415.*555.*2671/)).toBeTruthy();
  });

  it("renders international format when displayFormat='international'", () => {
    const { getByText } = render(
      <PhoneField source="phone" displayFormat="international" />,
      { wrapper: wrap({ id: 1, phone: "+442071234567" }) },
    );
    expect(getByText(/\+44 20 7123 4567/)).toBeTruthy();
  });

  it("renders a plain <span> (no link) when link is false", () => {
    const { container } = render(<PhoneField source="phone" link={false} />, {
      wrapper: wrap({ id: 1, phone: "+14155552671" }),
    });
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders the empty placeholder for an empty value", () => {
    const { getByText } = render(
      <PhoneField source="phone" empty="myapp.empty" />,
      {
        wrapper: wrap({ id: 1, phone: "" }),
      },
    );
    expect(getByText("—")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<PhoneField source="phone" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
