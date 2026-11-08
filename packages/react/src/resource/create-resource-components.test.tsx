/**
 * `createResourceComponentsOf(name)` binds the four views to one resource and
 * hands back the package's own fields and inputs. Every test mounts the result
 * under `<Admin>` and watches the data provider, since the binding is a
 * `resource` the views pass down.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../admin/admin";
import { ReferenceField } from "../components/admin/fields/reference-field";
import { TextField } from "../components/admin/fields/text-field";
import { TextInput } from "../components/admin/inputs/text-input";
import { DataTable } from "../components/admin/list/data-table";
import {
  createResourceComponents,
  createResourceComponentsOf,
} from "./create-resource-components";
import { Resource } from "./resource";

afterEach(cleanup);

const posts = createResourceComponentsOf("posts");
const comments = createResourceComponentsOf("comments");

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "Alpha" },
      { id: 2, title: "Beta" },
    ],
    comments: [{ id: 10, body: "First!" }],
  });
}

function mount(
  dataProvider: ReturnType<typeof makeDataProvider>,
  entry: string,
  resource: ReactNode,
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={createI18n({
          locale: "en",
          messages: {
            en: defineMessages({
              "chelone.page.list": "{name}",
              "chelone.navigation.no_results": "No results found",
            }),
          },
        })}
      >
        {resource}
      </Admin>
    </MemoryRouter>,
  );
}

describe("createResourceComponentsOf", () => {
  it("an Edit from the factory loads its own resource with no resource prop", async () => {
    const dataProvider = makeDataProvider();
    const getOne = vi.spyOn(dataProvider, "getOne");
    // The route belongs to `articles`, so only the factory's binding can send
    // the read to `posts`.
    const ArticleEdit = () => (
      <posts.Edit>
        <posts.TextInput source="title" />
      </posts.Edit>
    );

    mount(
      dataProvider,
      "/articles/1",
      <Resource name="articles" edit={ArticleEdit} />,
    );

    const input = await screen.findByLabelText(/title/i);
    await waitFor(() =>
      expect(elementOf(input, HTMLInputElement).value).toBe("Alpha"),
    );
    expect(getOne).toHaveBeenCalledWith("posts", { id: "1" });
    expect(getOne).not.toHaveBeenCalledWith("articles", expect.anything());
  });

  it("a List from the factory lists its own resource", async () => {
    const dataProvider = makeDataProvider();
    const getList = vi.spyOn(dataProvider, "getList");
    const ArticleList = () => (
      <posts.List>
        <DataTable>
          <DataTable.Col source="title" />
        </DataTable>
      </posts.List>
    );

    mount(
      dataProvider,
      "/articles",
      <Resource name="articles" list={ArticleList} />,
    );

    expect(await screen.findByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(getList).toHaveBeenCalledWith("posts", expect.anything());
    expect(getList).not.toHaveBeenCalledWith("articles", expect.anything());
  });

  it("a field and an input from the factory are the package's own components", () => {
    expect(posts.TextInput).toBe(TextInput);
    expect(posts.TextField).toBe(TextField);
    expect(posts.ReferenceField).toBe(ReferenceField);
    expect(comments.TextInput).toBe(TextInput);
  });

  it("two factories for two resources keep their views apart", async () => {
    const dataProvider = makeDataProvider();
    const getList = vi.spyOn(dataProvider, "getList");
    const Page = () => (
      <>
        <section aria-label="posts">
          <posts.List>
            <DataTable>
              <DataTable.Col source="title" />
            </DataTable>
          </posts.List>
        </section>
        <section aria-label="comments">
          <comments.List>
            <DataTable>
              <DataTable.Col source="body" />
            </DataTable>
          </comments.List>
        </section>
      </>
    );

    mount(dataProvider, "/pages", <Resource name="pages" list={Page} />);

    const postsSection = await screen.findByRole("region", { name: "posts" });
    const commentsSection = screen.getByRole("region", { name: "comments" });
    expect(await within(postsSection).findByText("Alpha")).toBeDefined();
    expect(await within(commentsSection).findByText("First!")).toBeDefined();
    expect(within(postsSection).queryByText("First!")).toBeNull();
    expect(within(commentsSection).queryByText("Alpha")).toBeNull();
    expect(getList).toHaveBeenCalledWith("posts", expect.anything());
    expect(getList).toHaveBeenCalledWith("comments", expect.anything());
  });

  it("createResourceComponents returns the same components as the explicit-map form", () => {
    const viaRegistered = createResourceComponents("posts");
    expect(viaRegistered.TextInput).toBe(posts.TextInput);
  });
});
