/**
 * The orders views mounted under `<Admin>` the way `App.tsx` mounts them, with
 * the demo's seed data and its registered `resources`. Asserts DOM, roles and
 * data-provider calls: jsdom applies no CSS, so nothing here asserts styling.
 *
 * The schema tests are the point of the typed components: `orderSchema` is in
 * the registry, so a form that breaks it never reaches the data provider.
 */
import { createNotificationStore, fakeDataProvider } from "@chelone/core";
import { makeDemoI18n, seedData } from "@chelone/demo-data";
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
  OrderCreate,
  OrderEdit,
  OrderList,
  OrderShow,
  orderSchema,
} from "./orders";

afterEach(cleanup);

function renderPage(
  routes: {
    list?: ReactElement;
    edit?: ReactElement;
    create?: ReactElement;
    show?: ReactElement;
  },
  path = "",
) {
  const dataProvider = fakeDataProvider(seedData());
  const calls = {
    create: vi.spyOn(dataProvider, "create"),
    getMany: vi.spyOn(dataProvider, "getMany"),
    getList: vi.spyOn(dataProvider, "getList"),
    getOne: vi.spyOn(dataProvider, "getOne"),
    update: vi.spyOn(dataProvider, "update"),
  };
  render(
    <MemoryRouter initialEntries={[`/orders${path}`]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={makeDemoI18n().i18n}
        notifications={createNotificationStore()}
        resources={resources}
      >
        <Resource name="orders" {...routes} />
      </Admin>
    </MemoryRouter>,
  );
  return calls;
}

function input(label: RegExp): HTMLInputElement {
  return elementOf(screen.getByLabelText(label), HTMLInputElement);
}

test("OrderList lists each order with its customer", async () => {
  const calls = renderPage({ list: <OrderList /> });

  await screen.findByText("ORD-2001");
  // The customer name arrives with the `getMany` for `customers`.
  expect(await screen.findByText("River Stone")).toBeTruthy();
  expect(calls.getList).toHaveBeenCalledWith(
    "orders",
    expect.objectContaining({ pagination: expect.anything() }),
  );
});

test("OrderEdit loads the order into the form and saves an edit", async () => {
  const calls = renderPage({ edit: <OrderEdit /> }, "/1");

  await waitFor(() => expect(input(/reference/i).value).toBe("ORD-2001"));
  expect(input(/quantity/i).value).toBe("1");
  expect(calls.getOne).toHaveBeenCalledWith(
    "orders",
    expect.objectContaining({ id: "1" }),
  );

  fireEvent.change(input(/reference/i), { target: { value: "ORD-9001" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "orders",
    expect.objectContaining({
      id: "1",
      data: expect.objectContaining({ reference: "ORD-9001" }),
    }),
  );
});

test("OrderEdit blocks a save the orders schema rejects", async () => {
  const calls = renderPage({ edit: <OrderEdit /> }, "/1");

  await waitFor(() => expect(input(/reference/i).value).toBe("ORD-2001"));
  fireEvent.change(input(/reference/i), { target: { value: "" } });
  fireEvent.change(input(/quantity/i), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Reference is required");
  expect(await screen.findByText("Quantity must be at least 1")).toBeTruthy();
  expect(calls.update).not.toHaveBeenCalled();
});

test("OrderCreate blocks an empty save the orders schema rejects", async () => {
  const calls = renderPage({ create: <OrderCreate /> }, "/create");

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Reference is required");
  expect(await screen.findByText("Pick a customer")).toBeTruthy();
  expect(calls.create).not.toHaveBeenCalled();
});

test("OrderCreate saves an order that leaves the optional delivery fields untouched", async () => {
  const calls = renderPage({ create: <OrderCreate /> }, "/create");

  fireEvent.change(input(/reference/i), { target: { value: "ORD-TEST" } });

  fireEvent.click(elementOf(screen.getByLabelText("Customer"), HTMLElement));
  const customerListbox = await screen.findByRole("listbox");
  fireEvent.click(within(customerListbox).getByText("River Stone"));

  fireEvent.click(
    elementOf(screen.getByLabelText("Main product"), HTMLElement),
  );
  const productListbox = await screen.findByRole("listbox");
  fireEvent.click(within(productListbox).getByText("Mechanical Keyboard"));

  fireEvent.click(elementOf(screen.getByLabelText(/status/i), HTMLElement));
  const statusListbox = await screen.findByRole("listbox");
  fireEvent.click(within(statusListbox).getByText("Pending"));

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.create).toHaveBeenCalledTimes(1));
  expect(calls.create).toHaveBeenCalledWith(
    "orders",
    expect.objectContaining({
      data: expect.objectContaining({
        reference: "ORD-TEST",
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        status: "pending",
        total: 0,
      }),
    }),
  );
});

test("OrderShow shows the order, its customer and its products", async () => {
  const calls = renderPage({ show: <OrderShow /> }, "/1/show");

  // `<Show>` titles the page with the record's own reference, so it is the
  // heading AND the value of the first field.
  await screen.findByRole("heading", { name: "ORD-2001" });
  expect(calls.getOne).toHaveBeenCalledWith(
    "orders",
    expect.objectContaining({ id: "1" }),
  );

  expect(await screen.findByText("River Stone")).toBeTruthy();
  expect(screen.getAllByText("Mechanical Keyboard").length).toBeGreaterThan(1);
  // The customer's own latest order, by delivery date: the other order of
  // customer 1, fetched through `ReferenceOneField`.
  expect(await screen.findByText("Customer's latest order")).toBeTruthy();
  expect(await screen.findByText("ORD-2011")).toBeTruthy();
});

test("the orders schema accepts every seeded order", () => {
  const orders = seedData().orders ?? [];
  expect(orders.length).toBeGreaterThan(0);
  for (const order of orders) {
    expect(orderSchema.safeParse(order).success).toBe(true);
  }
});

test("the orders schema accepts a create without the optional delivery fields", () => {
  expect(
    orderSchema.safeParse({
      reference: "ORD-TEST",
      customer_id: 1,
      product_id: 1,
      quantity: 1,
      status: "pending",
      total: 0,
    }).success,
  ).toBe(true);
});
