import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { PropsTable } from "./props-table";

afterEach(() => {
  localStorage.clear();
});

function renderTable(url: string, name = "Confirm") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PropsTable name={name} />
    </MemoryRouter>,
  );
}

const propNames = () =>
  within(screen.getByRole("table", { name: "Props" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

describe("PropsTable", () => {
  it("shows the React props by default", () => {
    renderTable("/docs/ui-layout/confirm");

    expect(propNames()).toContain("onConfirm");
    expect(propNames()).toContain("CancelIcon");
    expect(screen.queryByRole("table", { name: "Events" })).toBeNull();
  });

  it("shows the Vue props, events and slots when the page is set to Vue", () => {
    renderTable("/docs/ui-layout/confirm?framework=vue");

    expect(propNames()).toContain("isOpen");
    expect(propNames()).not.toContain("onConfirm");
    expect(propNames()).not.toContain("CancelIcon");
    const events = within(screen.getByRole("table", { name: "Events" }));
    expect(
      events
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(["close[]", "confirm[]"]);
    const slots = within(screen.getByRole("table", { name: "Slots" }));
    expect(slots.getAllByRole("row")[1]?.textContent).toContain("default");
  });

  it("follows the framework kept in local storage", () => {
    localStorage.setItem("chelone-docs-framework", "vue");
    renderTable("/docs/ui-layout/confirm");

    expect(propNames()).toContain("isOpen");
    expect(propNames()).not.toContain("onConfirm");
  });

  it("names the framework in the notice when it has no props for the component", () => {
    renderTable("/docs/x?framework=vue", "NoSuchComponent");

    expect(screen.getByText(/typed in the component source/)).toBeTruthy();
  });

  it("renders inline rows whatever the framework", () => {
    render(
      <MemoryRouter initialEntries={["/docs/x?framework=vue"]}>
        <PropsTable rows={[{ prop: "tone", type: "string" }]} />
      </MemoryRouter>,
    );

    expect(propNames()).toEqual(["tone"]);
  });
});
