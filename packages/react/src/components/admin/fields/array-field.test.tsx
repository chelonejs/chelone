/**
 * P7d-T3 — `<ArrayField>` ported onto chelone `useFieldValue` + `useList` +
 * `ListContextProvider`.
 *
 * Reads an array-valued `source` off the ambient record, drops it into a
 * client-side `ListContext` (no dataProvider), and renders its children. A list
 * consumer (`useListContext`) sees each array item as a row. Mirrors the
 * shadmin ArrayField contract: present array → rows; missing/empty → empty list.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import { ArrayField } from "./array-field";

const TEST_RECORD = {
  id: "record-1",
  values: [{ id: "value-1" }, { id: "value-2" }, { id: "value-3" }],
};

interface Row {
  id: string;
}

function TestConsumer() {
  const { data = [] } = useListContext();
  return (
    <ul>
      {(data as Row[]).map((value) => (
        <li key={value.id} aria-label={value.id}>
          {value.id}
        </li>
      ))}
    </ul>
  );
}

afterEach(cleanup);

describe("<ArrayField>", () => {
  it("passes the array value into a list context", () => {
    render(
      <RecordContextProvider value={TEST_RECORD}>
        <ArrayField source="values">
          <TestConsumer />
        </ArrayField>
      </RecordContextProvider>,
    );
    expect(screen.getByRole("list")).toBeTruthy();
    for (const value of TEST_RECORD.values) {
      expect(screen.getByRole("listitem", { name: value.id }).textContent).toBe(
        value.id,
      );
    }
  });

  it("passes an empty list to the context when the array is empty", () => {
    render(
      <RecordContextProvider value={{ id: "empty", values: [] }}>
        <ArrayField source="values">
          <TestConsumer />
        </ArrayField>
      </RecordContextProvider>,
    );
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("passes an empty list when the source does not exist on the record", () => {
    render(
      <RecordContextProvider value={{ id: "no-source" }}>
        <ArrayField source="values">
          <TestConsumer />
        </ArrayField>
      </RecordContextProvider>,
    );
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it.each([
    ["a string", "not-an-array"],
    ["an object", { id: "value-1" }],
    ["null", null],
  ])("passes an empty list when the value is %s", (_label, value) => {
    render(
      <RecordContextProvider value={{ id: "non-array", values: value }}>
        <ArrayField source="values">
          <TestConsumer />
        </ArrayField>
      </RecordContextProvider>,
    );
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
