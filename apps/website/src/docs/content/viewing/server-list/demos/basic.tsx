import { type Identifier, parseListParams } from "@chelone/core";
import { useLocation } from "@chelone/react";
import { ServerList } from "@chelone/react/rsc";

interface Post {
  id: number;
  title: string;
  views: number;
  author_id: number;
}

interface Author {
  id: number;
  name: string;
}

const authors = new Map<Identifier, Author>([
  [1, { id: 1, name: "Ada Lovelace" }],
  [2, { id: 2, name: "Alan Turing" }],
]);

const posts: Post[] = [
  "Notes on the Analytical Engine",
  "On Computable Numbers",
  "Computing Machinery and Intelligence",
  "Sketch of the Analytical Engine",
  "The Chemical Basis of Morphogenesis",
  "Intelligent Machinery",
  "Rounding Off-Errors in Matrix Processes",
].map((title, index) => ({
  id: index + 1,
  title,
  views: (index * 37) % 100,
  author_id: (index % 2) + 1,
}));

/**
 * The page `loadServerListPage` would return for this URL, from the fixture
 * posts: in an app the server loads it, and here the demo sorts and slices.
 */
function fixturePage(search: string) {
  const {
    sort = "id",
    order = "ASC",
    page = 1,
    perPage = 3,
  } = parseListParams<Post>(search);
  const field = sort === "title" || sort === "views" ? sort : "id";
  const compare = (a: Post, b: Post) =>
    field === "title" ? a.title.localeCompare(b.title) : a[field] - b[field];
  const sorted = [...posts].sort(
    (a, b) => compare(a, b) * (order === "ASC" ? 1 : -1),
  );
  return {
    params: {
      pagination: { page, perPage },
      sort: { field, order },
    },
    data: sorted.slice((page - 1) * perPage, page * perPage),
    total: posts.length,
    references: { author_id: authors },
  };
}

/** `<ServerList>` over a fixture page; its links move this page's URL. */
export default function ServerListDemo() {
  const { pathname, search } = useLocation();
  return (
    <ServerList
      page={fixturePage(search)}
      path={pathname}
      columns={[
        { source: "title", label: "Title", sortable: true },
        {
          source: "author_id",
          label: "Author",
          reference: true,
          representation: "name",
        },
        { source: "views", label: "Views", sortable: true },
      ]}
      rowActions={(post) => <a href={`#post-${post.id}`}>Open</a>}
    />
  );
}
