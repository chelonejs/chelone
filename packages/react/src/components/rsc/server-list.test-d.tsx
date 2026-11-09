import {
  defineResources,
  fakeDataProvider,
  type Identifier,
  loadServerListPage,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { describe, it } from "vitest";
import { z } from "zod";
import { ServerList } from "./server-list";

interface Post {
  id: number;
  title: string;
  author: { name: string };
  author_id: number;
}

interface User {
  id: number;
  name: string;
}

const page = {
  params: {},
  data: [] as Post[],
  references: { author_id: new Map<Identifier, User>() },
};

describe("ServerList types", () => {
  it("takes a source path of the record, and a cell over the record", () => {
    <ServerList
      page={page}
      path="/posts"
      columns={[
        { source: "title", label: "Title", sortable: true },
        { source: "author.name", label: "Author" },
        {
          source: "title",
          label: "Shout",
          cell: (record) => record.title.toUpperCase(),
        },
      ]}
      rowActions={(record) => record.author.name}
    />;
  });

  it("rejects a column source outside the record", () => {
    <ServerList
      page={page}
      path="/posts"
      columns={[
        // @ts-expect-error "titel" is not a path of Post
        { source: "titel", label: "Title" },
      ]}
    />;
  });

  it("takes reference: true on a key of page.references, with a path of the referenced record", () => {
    <ServerList
      page={page}
      path="/posts"
      columns={[
        {
          source: "author_id",
          label: "Author",
          reference: true,
          representation: "name",
        },
      ]}
    />;
  });

  it("rejects reference: true on a key not in page.references", () => {
    <ServerList
      page={page}
      path="/posts"
      columns={[
        // @ts-expect-error "title" is no key of page.references
        { source: "title", label: "Title", reference: true },
      ]}
    />;
  });

  it("rejects a representation outside the referenced record", () => {
    <ServerList
      page={page}
      path="/posts"
      columns={[
        // @ts-expect-error "nmae" is not a path of User
        {
          source: "author_id",
          label: "Author",
          reference: true,
          representation: "nmae",
        },
      ]}
    />;
  });

  it("takes what loadServerListPage returns", async () => {
    const resources = defineResources({
      posts: {
        schema: z.object({
          id: z.number(),
          title: z.string(),
          author_id: z.number(),
        }),
      },
      users: { schema: z.object({ id: z.number(), name: z.string() }) },
    });
    const loaded = await loadServerListPage(
      {
        dataProvider: fakeDataProvider<typeof resources>({}),
        queryClient: new QueryClient(),
      },
      "posts",
      { references: { author_id: "users" } },
    );
    <ServerList
      page={loaded}
      path="/posts"
      columns={[
        { source: "title", label: "Title" },
        {
          source: "author_id",
          label: "Author",
          reference: true,
          representation: "name",
        },
        // @ts-expect-error "title" is no key of the page's references
        { source: "title", label: "Title", reference: true },
      ]}
    />;
  });
});
