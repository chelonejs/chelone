/**
 * `<EditGuesser>` — an edit page whose inputs come from the resource's
 * registered Zod schema. Each test mounts it as a `<Resource edit>` under
 * `<Admin resources>` and asserts on the DOM and the data-provider calls.
 */

import {
  type DataProvider,
  defineResources,
  fakeDataProvider,
  type ResourceMap,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Admin, Resource } from "../../../index";
import { EditGuesser, type EditGuesserProps } from "./edit-guesser";

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
  props: EditGuesserProps = { enableLog: false },
  dataProvider: DataProvider = fakeDataProvider(seed()),
) {
  const getOne = vi.spyOn(dataProvider, "getOne");
  const update = vi.spyOn(dataProvider, "update");
  let current = props;
  const Page = () => <EditGuesser {...current} />;
  const view = () => (
    <MemoryRouter initialEntries={["/posts/1"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
        resources={resources}
      >
        <Resource name="posts" edit={Page} />
        <Resource name="authors" />
        <Resource name="tags" />
      </Admin>
    </MemoryRouter>
  );
  const { rerender } = render(view());
  return {
    getOne,
    update,
    rerender: (next: EditGuesserProps) => {
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
        title: z.string().min(3, "Too short"),
        views: z.number(),
      }),
    },
  });

const input = (name: RegExp | string) =>
  screen.getByLabelText(name) as HTMLInputElement;

describe("EditGuesser", () => {
  it("renders an input per schema field once the record loads", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string().describe("Headline"),
            views: z.number(),
            published: z.boolean(),
          }),
        },
      }),
    );
    await screen.findByLabelText("Headline");
    expect(screen.getByLabelText(/views/i)).toBeTruthy();
    expect(screen.getByRole("switch", { name: /published/i })).toBeTruthy();
    expect(screen.getByRole("toolbar")).toBeTruthy();
    expect(screen.getByRole("button", { name: /save/i })).toBeTruthy();
  });

  it("leaves the id out of the form", async () => {
    mount(postsResources());
    await screen.findByLabelText(/title/i);
    expect(screen.queryByLabelText(/^id$/i)).toBeNull();
  });

  it("fills the inputs from the loaded record", async () => {
    mount(postsResources());
    await waitFor(() => expect(input(/title/i).value).toBe("Alpha"));
    expect(input(/views/i).value).toBe("12");
  });

  it("renders a reference as a ReferenceInput with an autocomplete", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string(),
            author_id: z.number().describe("Author"),
          }),
          references: { author_id: "authors" },
        },
        authors: { schema: z.object({ id: z.number(), name: z.string() }) },
      }),
    );
    const trigger = await screen.findByRole("combobox");
    await waitFor(() => expect(trigger.textContent).toContain("Ada"));
    fireEvent.click(trigger);
    expect(await screen.findByText("Grace")).toBeTruthy();
  });

  it("labels a reference from the schema describe text", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            author_id: z.number().describe("Writer"),
          }),
          references: { author_id: "authors" },
        },
        authors: { schema: z.object({ id: z.number(), name: z.string() }) },
      }),
    );
    expect(await screen.findByText("Writer")).toBeTruthy();
    expect(screen.queryByText("Author id")).toBeNull();
  });

  it("labels a referenceArray from the schema describe text", async () => {
    mount(
      defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            tag_ids: z.array(z.number()).describe("Labels"),
          }),
          references: { tag_ids: "tags" },
        },
        tags: { schema: z.object({ id: z.number(), name: z.string() }) },
      }),
      { enableLog: false },
      fakeDataProvider({
        ...seed(),
        posts: [{ id: 1, title: "Alpha", tag_ids: [1] }],
        tags: [{ id: 1, name: "News" }],
      }),
    );
    expect(await screen.findByText("Labels")).toBeTruthy();
    expect(screen.queryByText("Tag ids")).toBeNull();
  });

  it("blocks a save that breaks the registry schema", async () => {
    const { update } = mount(postsResources());
    await waitFor(() => expect(input(/title/i).value).toBe("Alpha"));
    fireEvent.change(input(/title/i), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Too short")).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("saves the edited values through the data provider", async () => {
    const { update } = mount(postsResources());
    await waitFor(() => expect(input(/title/i).value).toBe("Alpha"));
    fireEvent.change(input(/title/i), { target: { value: "Omega" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        id: "1",
        data: expect.objectContaining({ title: "Omega" }),
      }),
    );
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
    await screen.findByLabelText(/title/i);
    rerender({ enableLog: true, title: "Edit a post" });
    await screen.findByLabelText(/title/i);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain('Guessed Edit for "posts"');
  });

  it("logs nothing when enableLog is false", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mount(postsResources(), { enableLog: false });
    await screen.findByLabelText(/title/i);
    expect(log).not.toHaveBeenCalled();
  });
});
