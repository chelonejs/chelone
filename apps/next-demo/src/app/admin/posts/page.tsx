import { Prefetched } from "../../../prefetched";
import { prefetchList } from "../../../server-context";
import { PostList } from "../../../views";
import { type SearchParams, searchOf } from "../../search-of";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const state = await prefetchList("posts", searchOf(await searchParams));
  return (
    <Prefetched state={state}>
      <PostList />
    </Prefetched>
  );
}
