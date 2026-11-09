/**
 * The authors views mounted under `<Admin>` the way `App.tsx` mounts them, with
 * the demo's seed data and its registered `resources`. Asserts DOM, roles and
 * data-provider calls: jsdom applies no CSS, so nothing here asserts styling.
 *
 * The schema tests are the point of the typed components: `authorSchema` is in
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
import { AuthorCreate, AuthorEdit, AuthorList, AuthorShow } from "./authors";

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

test("AuthorList lists each author with their email as a mailto link", async () => {
  const calls = renderPage({
    resource: "authors",
    routes: { list: <AuthorList /> },
  });

  await screen.findByText("Ada Lovelace");
  const email = screen.getByRole("link", { name: "ada@example.com" });
  expect(elementOf(email, HTMLAnchorElement).getAttribute("href")).toBe(
    "mailto:ada@example.com",
  );
  expect(calls.getManyReference).not.toHaveBeenCalled();
});

test("AuthorEdit loads the author into the form and saves an edit", async () => {
  const calls = renderPage({
    resource: "authors",
    routes: { edit: <AuthorEdit /> },
    path: "/1",
  });

  await waitFor(() => expect(input(/name/i).value).toBe("Ada Lovelace"));
  expect(input(/email/i).value).toBe("ada@example.com");
  expect(calls.getOne).toHaveBeenCalledWith(
    "authors",
    expect.objectContaining({ id: "1" }),
  );

  fireEvent.change(input(/name/i), { target: { value: "Ada King" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "authors",
    expect.objectContaining({
      id: "1",
      data: expect.objectContaining({ name: "Ada King" }),
    }),
  );
});

test("AuthorEdit blocks a save the authors schema rejects", async () => {
  const calls = renderPage({
    resource: "authors",
    routes: { edit: <AuthorEdit /> },
    path: "/1",
  });

  await waitFor(() => expect(input(/name/i).value).toBe("Ada Lovelace"));
  fireEvent.change(input(/name/i), { target: { value: "" } });
  fireEvent.change(input(/email/i), { target: { value: "not-an-email" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(await screen.findByText("Enter a valid email address")).toBeTruthy();
  expect(calls.update).not.toHaveBeenCalled();
});

test("AuthorCreate blocks an empty save the authors schema rejects", async () => {
  const calls = renderPage({
    resource: "authors",
    routes: { create: <AuthorCreate /> },
    path: "/create",
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(calls.create).not.toHaveBeenCalled();
});

test("AuthorShow shows the author and the posts that reference them", async () => {
  const calls = renderPage({
    resource: "authors",
    routes: { show: <AuthorShow /> },
    path: "/1/show",
  });

  // `<Show>` titles the page with the record's own name, so the name is a heading.
  await screen.findByRole("heading", { name: "Ada Lovelace" });
  const email = screen.getByRole("link", { name: "ada@example.com" });
  expect(elementOf(email, HTMLAnchorElement).getAttribute("href")).toBe(
    "mailto:ada@example.com",
  );
  expect(calls.getOne).toHaveBeenCalledWith(
    "authors",
    expect.objectContaining({ id: "1" }),
  );

  await waitFor(() => expect(calls.getManyReference).toHaveBeenCalled());
  expect(calls.getManyReference).toHaveBeenCalledWith(
    "posts",
    expect.objectContaining({ target: "author_id", id: 1 }),
  );
  const table = await screen.findByRole("table");
  expect(within(table).getByText("Analytical Engines Explained")).toBeTruthy();
});
