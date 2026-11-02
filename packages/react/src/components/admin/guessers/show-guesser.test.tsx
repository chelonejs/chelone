/**
 * `<ShowGuesser>` — a show page whose fields come from the resource's
 * registered Zod schema. Each test mounts it as a `<Resource show>` under
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Admin, Resource } from "../../../index";
import { ShowGuesser, type ShowGuesserProps } from "./show-guesser";

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
      views: 12,
    },
  ],
  authors: [
    { id: 7, name: "Ada" },
    { id: 8, name: "Grace" },
  ],
});

function mount(
  resources: ResourceMap,
  props: ShowGuesserProps = { enableLog: false },
  dataProvider: DataProvider = fakeDataProvider(seed()),
) {
  const getOne = vi.spyOn(dataProvider, "getOne");
  let current = props;
  const Page = () => <ShowGuesser {...current} />;
  const view = () => (
    <MemoryRouter initialEntries={["/posts/1/show"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        resources={resources}
      >
        <Resource name="posts" show={Page} />
        <Resource name="authors" />
        <Resource name="tags" />
      </Admin>
    </MemoryRouter>
  );
  const { container, rerender } = render(view());
  return {
    container,
    getOne,
    rerender: (next: ShowGuesserProps) => {
      current = next;
      rerender(view());
    },
  };
}

const postsResources = () =>
  defineResources({
    posts: {
      schema: z.object({
        id: z.number(),
        title: z.string(),
        views: z.number(),
      }),
    },
  });

describe("ShowGuesser", () => {
  it("renders a labeled value per schema field once the record loads", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string().describe("Headline"),
            views: z.number(),
          }),
        },
      }),
      { enableLog: false, title: false },
    );
    expect(await screen.findByText("Headline")).toBeTruthy();
    expect(screen.getByText("Views")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("shows the id", async () => {
    mount(postsResources());
    expect(await screen.findByText("Id")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("renders a boolean through BooleanField", async () => {
    const { container } = mount(
      defineResources({
        posts: { schema: z.object({ id: z.number(), published: z.boolean() }) },
      }),
    );
    expect(await screen.findByText("Published")).toBeTruthy();
    expect(container.querySelector("svg.lucide-check")).toBeTruthy();
    expect(screen.queryByText("Yes")).toBeNull();
  });

  it("renders a reference through ReferenceField", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({ id: z.number(), author_id: z.number() }),
          references: { author_id: "authors" },
        },
        authors: { schema: z.object({ id: z.number(), name: z.string() }) },
      }),
    );
    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(screen.queryByText("7")).toBeNull();
  });

  it("skips unsupported fields", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string(),
            meta: z.object({ a: z.string() }),
          }),
        },
      }),
    );
    expect(await screen.findByText("Title")).toBeTruthy();
    expect(screen.queryByText("Meta")).toBeNull();
  });

  it("shows GuesserEmpty and fetches no record when the resource has no schema", async () => {
    const { getOne } = mount(defineResources({ posts: {} }));
    expect(
      await screen.findByRole("heading", { name: "No schema registered" }),
    ).toBeTruthy();
    expect(getOne).not.toHaveBeenCalled();
  });

  it("logs the generated code once per resource when enableLog is on", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { rerender } = mount(postsResources(), { enableLog: true });
    await screen.findByText("Title");
    rerender({ enableLog: true, title: "A post" });
    await screen.findByText("A post");
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain('Guessed Show for "posts"');
  });

  it("logs nothing when enableLog is false", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mount(postsResources(), { enableLog: false });
    await screen.findByText("Title");
    expect(log).not.toHaveBeenCalled();
  });
});
