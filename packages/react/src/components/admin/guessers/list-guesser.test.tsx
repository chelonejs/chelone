/**
 * `<ListGuesser>` — a list page whose columns come from the resource's
 * registered Zod schema. Each test mounts it as a `<Resource list>` under
 * `<Admin resources>` and asserts on the DOM and the data-provider calls.
 */

import {
  type DataProvider,
  defineResources,
  fakeDataProvider,
  type ResourceMap,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Admin, Resource } from "../../../index";
import { ListGuesser, type ListGuesserProps } from "./list-guesser";

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const seed = () => ({
  posts: [
    {
      id: 1,
      title: "Alpha",
      author_id: 7,
      published: true,
      contact: "alpha@example.com",
      created: "2024-03-05T00:00:00.000Z",
    },
  ],
  authors: [{ id: 7, name: "Ada" }],
});

function mount(
  resources: ResourceMap,
  props: ListGuesserProps = { enableLog: false },
  dataProvider: DataProvider = fakeDataProvider(seed()),
) {
  const getList = vi.spyOn(dataProvider, "getList");
  let current = props;
  const Page = () => <ListGuesser {...current} />;
  const view = () => (
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        resources={resources}
      >
        <Resource name="posts" list={Page} />
        <Resource name="authors" />
      </Admin>
    </MemoryRouter>
  );
  const { rerender } = render(view());
  return {
    getList,
    rerender: (next: ListGuesserProps) => {
      current = next;
      rerender(view());
    },
  };
}

const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());

describe("ListGuesser", () => {
  it("renders a header per schema field in schema order", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string(),
            views: z.number(),
          }),
        },
      }),
    );
    await screen.findByText("Alpha");
    expect(headers()).toEqual(["Id", "Title", "Views"]);
  });

  it("renders reference, boolean, email and date cells with their fields", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string(),
            author_id: z.number().describe("Author"),
            published: z.boolean(),
            contact: z.string().email(),
            created: z.string().datetime(),
          }),
          references: { author_id: "authors" },
        },
        authors: { schema: z.object({ id: z.number(), name: z.string() }) },
      }),
    );
    expect(await screen.findByText("Ada")).toBeTruthy();
    const email = screen.getByText("alpha@example.com").closest("a");
    expect(email?.getAttribute("href")).toBe("mailto:alpha@example.com");
    expect(document.querySelector("svg.lucide-check")).toBeTruthy();
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it("skips unsupported fields", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string(),
            meta: z.record(z.string()),
          }),
        },
      }),
    );
    await screen.findByText("Alpha");
    expect(headers()).toEqual(["Id", "Title"]);
  });

  it("labels a column from the schema describe text", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string().describe("Headline"),
          }),
        },
      }),
    );
    await screen.findByText("Alpha");
    expect(headers()).toEqual(["Id", "Headline"]);
  });

  it("shows GuesserEmpty and requests no list when the resource has no schema", async () => {
    const { getList } = mount(defineResources({ posts: {} }));
    expect(
      await screen.findByRole("heading", { name: "No schema registered" }),
    ).toBeTruthy();
    expect(getList).not.toHaveBeenCalled();
  });

  describe("logging", () => {
    const resources = () =>
      defineResources({
        posts: { schema: z.object({ id: z.number(), title: z.string() }) },
      });

    it("logs the generated code once per resource when enableLog is on", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const { rerender } = mount(resources(), { enableLog: true });
      await screen.findByText("Alpha");
      rerender({ enableLog: true, perPage: 5 });
      await screen.findByText("Alpha");
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0]?.[0]).toContain('Guessed List for "posts"');
    });

    it("logs nothing when enableLog is false", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      mount(resources(), { enableLog: false });
      await screen.findByText("Alpha");
      expect(log).not.toHaveBeenCalled();
    });
  });

  it("passes perPage and title through to List", async () => {
    const { getList } = mount(
      defineResources({
        posts: { schema: z.object({ id: z.number(), title: z.string() }) },
      }),
      { enableLog: false, perPage: 5, title: "All the posts" },
    );
    await screen.findByText("Alpha");
    expect(
      screen.getByRole("heading", { level: 2, name: "All the posts" }),
    ).toBeTruthy();
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        pagination: expect.objectContaining({ perPage: 5 }),
      }),
    );
  });
});
