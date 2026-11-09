/**
 * The customers views mounted under `<Admin>` the way `App.tsx` mounts them,
 * with the demo's seed data and its registered `resources`. Asserts DOM, roles
 * and data-provider calls: jsdom applies no CSS, so nothing here asserts styling.
 *
 * The schema tests are the point of the typed components: `customerSchema` is
 * in the registry, so a form that breaks it never reaches the data provider.
 */
import { createNotificationStore, fakeDataProvider } from "@chelone/core";
import { makeDemoI18n, makeDemoStore, seedData } from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { resources } from ".";
import {
  CustomerCreate,
  CustomerEdit,
  CustomerList,
  CustomerShow,
} from "./customers";

afterEach(cleanup);

interface Page {
  resource: keyof typeof resources;
  routes: {
    list?: ReactElement;
    edit?: ReactElement;
    create?: ReactElement;
    show?: ReactElement;
  };
  path?: string;
}

function renderPage({ resource, routes, path = "" }: Page) {
  const dataProvider = fakeDataProvider(seedData());
  const calls = {
    create: vi.spyOn(dataProvider, "create"),
    getManyReference: vi.spyOn(dataProvider, "getManyReference"),
    getOne: vi.spyOn(dataProvider, "getOne"),
    update: vi.spyOn(dataProvider, "update"),
  };
  render(
    <MemoryRouter initialEntries={[`/${resource}${path}`]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={makeDemoI18n().i18n}
        notifications={createNotificationStore()}
        store={makeDemoStore()}
        resources={resources}
      >
        <Resource name={resource} {...routes} />
      </Admin>
    </MemoryRouter>,
  );
  return calls;
}

function input(label: RegExp): HTMLInputElement {
  return elementOf(screen.getByLabelText(label), HTMLInputElement);
}

test("CustomerList lists each customer with their email as a mailto link", async () => {
  const calls = renderPage({
    resource: "customers",
    routes: { list: <CustomerList /> },
  });

  await screen.findByText("River Stone");
  const table = screen.getByRole("table");
  const row = within(table).getByRole("row", { name: /River Stone/ });
  expect(within(row).getByText("Portland")).toBeTruthy();
  expect(within(row).getByText("free")).toBeTruthy();
  expect(within(row).getByText("new")).toBeTruthy();

  const email = within(row).getByRole("link", { name: "river@example.com" });
  expect(elementOf(email, HTMLAnchorElement).getAttribute("href")).toBe(
    "mailto:river@example.com",
  );

  // The list is one page of five, and the side list is a separate query.
  expect(within(table).queryByText("Toby Meyer")).toBeNull();
  expect(calls.getManyReference).not.toHaveBeenCalled();
});

test("CustomerList keeps the at-risk customers in their own side list", async () => {
  renderPage({ resource: "customers", routes: { list: <CustomerList /> } });

  const side = await screen.findByRole("region", { name: "At-risk customers" });
  await within(side).findByText("Sam Rivera");
  expect(within(side).getByText("Kai Fischer")).toBeTruthy();
  expect(within(side).queryByText("River Stone")).toBeNull();
});

test("CustomerEdit loads the customer into the form and saves an edit", async () => {
  const calls = renderPage({
    resource: "customers",
    routes: { edit: <CustomerEdit /> },
    path: "/1",
  });

  await waitFor(() => expect(input(/name/i).value).toBe("River Stone"));
  expect(input(/email/i).value).toBe("river@example.com");
  expect(input(/city/i).value).toBe("Portland");
  expect(calls.getOne).toHaveBeenCalledWith(
    "customers",
    expect.objectContaining({ id: "1" }),
  );

  fireEvent.change(input(/city/i), { target: { value: "Lisbon" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "customers",
    expect.objectContaining({
      id: "1",
      data: expect.objectContaining({ city: "Lisbon" }),
    }),
  );
});

test("CustomerEdit blocks a save the customers schema rejects", async () => {
  const calls = renderPage({
    resource: "customers",
    routes: { edit: <CustomerEdit /> },
    path: "/1",
  });

  await waitFor(() => expect(input(/name/i).value).toBe("River Stone"));
  fireEvent.change(input(/name/i), { target: { value: "" } });
  fireEvent.change(input(/email/i), { target: { value: "not-an-email" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(await screen.findByText("Enter a valid email address")).toBeTruthy();
  expect(calls.update).not.toHaveBeenCalled();
});

test("CustomerEdit saves a customer whose optional phone and join date are cleared", async () => {
  const calls = renderPage({
    resource: "customers",
    routes: { edit: <CustomerEdit /> },
    path: "/1",
  });

  await waitFor(() => expect(input(/name/i).value).toBe("River Stone"));
  fireEvent.change(input(/phone/i), { target: { value: "" } });
  fireEvent.change(input(/customer since/i), { target: { value: "" } });
  fireEvent.blur(input(/customer since/i));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("Phone must be text")).toBeNull();
  expect(screen.queryByText("Customer since must be a date")).toBeNull();
});

test("CustomerCreate blocks an empty save the customers schema rejects", async () => {
  const calls = renderPage({
    resource: "customers",
    routes: { create: <CustomerCreate /> },
    path: "/create",
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(await screen.findByText("City is required")).toBeTruthy();
  expect(calls.create).not.toHaveBeenCalled();
});

test("CustomerShow shows the customer, their plan and the orders that reference them", async () => {
  const calls = renderPage({
    resource: "customers",
    routes: { show: <CustomerShow /> },
    path: "/1/show",
  });

  // `<Show>` titles the page with the record's own name, so the name is a heading.
  await screen.findByRole("heading", { name: "River Stone" });
  const email = screen.getByRole("link", { name: "river@example.com" });
  expect(elementOf(email, HTMLAnchorElement).getAttribute("href")).toBe(
    "mailto:river@example.com",
  );
  expect(calls.getOne).toHaveBeenCalledWith(
    "customers",
    expect.objectContaining({ id: "1" }),
  );

  // The plan badge and the usage meter read `plan`, `usage` and `usage_limit`.
  await screen.findByText("Free");
  expect(screen.getByText("12 / 100 %")).toBeTruthy();

  await waitFor(() => expect(calls.getManyReference).toHaveBeenCalled());
  expect(calls.getManyReference).toHaveBeenCalledWith(
    "orders",
    expect.objectContaining({ target: "customer_id", id: 1 }),
  );
  const table = await screen.findByRole("table");
  expect(within(table).getByText("ORD-2001")).toBeTruthy();
});
