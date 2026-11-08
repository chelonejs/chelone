import { fakeDataProvider } from "@chelone/core";
import { makeDemoI18n, seedData } from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test } from "vitest";
import { resources } from ".";
import { AuthorCreate, AuthorEdit } from "./authors";

afterEach(cleanup);

function renderForm(
  resource: keyof typeof resources,
  form: ReactElement,
  path = "/1",
) {
  render(
    <MemoryRouter initialEntries={[`/${resource}${path}`]}>
      <Admin
        dataProvider={fakeDataProvider(seedData())}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={makeDemoI18n().i18n}
        resources={resources}
      >
        <Resource name={resource} edit={form} create={form} />
      </Admin>
    </MemoryRouter>,
  );
}

const forms = [
  { name: "AuthorEdit", resource: "authors", form: <AuthorEdit />, path: "/1" },
  {
    name: "AuthorCreate",
    resource: "authors",
    form: <AuthorCreate />,
    path: "/create",
  },
] satisfies {
  name: string;
  resource: keyof typeof resources;
  form: ReactElement;
  path: string;
}[];

test.each(forms)(
  "$name shows a save button",
  async ({ resource, form, path }) => {
    renderForm(resource, form, path);
    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
  },
);
