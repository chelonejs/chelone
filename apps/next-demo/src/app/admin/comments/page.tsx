import { Prefetched } from "../../../prefetched";
import { prefetchList } from "../../../server-context";
import { CommentList } from "../../../views";
import { type SearchParams, searchOf } from "../search-of";

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const state = await prefetchList("comments", searchOf(await searchParams));
  return (
    <Prefetched state={state}>
      <CommentList />
    </Prefetched>
  );
}
