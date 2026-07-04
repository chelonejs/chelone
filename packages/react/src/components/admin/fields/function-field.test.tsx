/**
 * P7d-T1 tests: `<FunctionField>` — render the record via a render function.
 */

import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { RecordContextProvider } from "../../../record/record-context";
import { FunctionField } from "./function-field";

afterEach(cleanup);

function wrap(record: unknown) {
  return ({ children }: { children: ReactNode }) => (
    <RecordContextProvider value={record as Record<string, unknown>}>
      {children}
    </RecordContextProvider>
  );
}

interface Person extends Record<string, unknown> {
  id: number;
  first_name: string;
  last_name: string;
}

describe("<FunctionField />", () => {
  it("renders the output of render(record)", () => {
    const { getByText } = render(
      <FunctionField<Person>
        render={(r) => `${r.first_name} ${r.last_name}`}
      />,
      { wrapper: wrap({ id: 1, first_name: "Ada", last_name: "Lovelace" }) },
    );
    expect(getByText("Ada Lovelace")).toBeTruthy();
  });

  it("passes the source string to the render function", () => {
    const { getByText } = render(
      <FunctionField<Person>
        source="last_name"
        render={(_r, source) => `source:${source}`}
      />,
      { wrapper: wrap({ id: 1, first_name: "Ada", last_name: "Lovelace" }) },
    );
    expect(getByText("source:last_name")).toBeTruthy();
  });

  it("uses the record prop over the ambient record", () => {
    const { getByText } = render(
      <FunctionField<Person>
        record={{ id: 2, first_name: "Grace", last_name: "Hopper" }}
        render={(r) => r.first_name}
      />,
      { wrapper: wrap({ id: 1, first_name: "Ada", last_name: "Lovelace" }) },
    );
    expect(getByText("Grace")).toBeTruthy();
  });

  it("renders nothing when no record is in scope", () => {
    const { container } = render(
      <FunctionField<Person> render={(r) => r.first_name} />,
    );
    expect(container.textContent).toBe("");
  });
});
