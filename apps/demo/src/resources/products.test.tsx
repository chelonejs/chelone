/**
 * The products views mounted under `<Admin>` the way `App.tsx` mounts them,
 * with the demo's seed data and its registered `resources`. Asserts DOM, roles
 * and data-provider calls: jsdom applies no CSS, so nothing here asserts
 * styling.
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
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import ProductVariants from "../pages/product-variants";
import { resources } from ".";
import { ProductCreate, ProductEdit, ProductList } from "./products";

afterEach(cleanup);

function renderPage(routes: Record<string, ReactElement>, path: string) {
  const dataProvider = fakeDataProvider(seedData());
  const calls = {
    create: vi.spyOn(dataProvider, "create"),
    getOne: vi.spyOn(dataProvider, "getOne"),
    update: vi.spyOn(dataProvider, "update"),
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={makeDemoI18n().i18n}
        notifications={createNotificationStore()}
        resources={resources}
      >
        <Resource name="products" {...routes} />
      </Admin>
    </MemoryRouter>,
  );
  return calls;
}

function input(label: RegExp): HTMLInputElement {
  return elementOf(screen.getByLabelText(label), HTMLInputElement);
}

test("ProductList lists each product with its SKU", async () => {
  renderPage({ list: <ProductList /> }, "/products");

  await screen.findByText("Mechanical Keyboard");
  expect(screen.getByText("SKU-1000")).toBeTruthy();
});

test("ProductEdit loads the product into the form and saves an edit", async () => {
  const calls = renderPage({ edit: <ProductEdit /> }, "/products/1");

  await waitFor(() =>
    expect(input(/^name/i).value).toBe("Mechanical Keyboard"),
  );
  fireEvent.change(input(/^name/i), { target: { value: "Split Keyboard" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "products",
    expect.objectContaining({
      id: "1",
      data: expect.objectContaining({ name: "Split Keyboard" }),
    }),
  );
});

test("ProductEdit blocks a save the products schema rejects", async () => {
  const calls = renderPage({ edit: <ProductEdit /> }, "/products/1");

  await waitFor(() =>
    expect(input(/^name/i).value).toBe("Mechanical Keyboard"),
  );
  fireEvent.change(input(/^name/i), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(calls.update).not.toHaveBeenCalled();
});

test("ProductCreate blocks an empty save the products schema rejects", async () => {
  const calls = renderPage({ create: <ProductCreate /> }, "/products/create");

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(calls.create).not.toHaveBeenCalled();
});

test("ProductVariants edits product 1 with its variants", async () => {
  const calls = renderPage({ edit: <ProductVariants /> }, "/products/1");

  await waitFor(() => expect(calls.getOne).toHaveBeenCalled());
  await screen.findByRole("tab", { name: "Variants" });
});
