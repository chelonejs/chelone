import { HydrationBoundary } from "@tanstack/react-query";
import { prefetchList } from "../../../server-context";
import { PostList } from "../../../views";

type SearchParams = Record<string, string | string[] | undefined>;

/** The URL's query string, as the list controller reads it from the location. */
function searchOf(params: SearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value ?? []].flat()) search.append(key, item);
  }
  return search.toString();
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const state = await prefetchList("posts", searchOf(await searchParams));
  return (
    <HydrationBoundary state={state}>
      <PostList />
    </HydrationBoundary>
  );
}
