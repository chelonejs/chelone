import { Prefetched } from "../../../../prefetched";
import { prefetchOne } from "../../../../server-context";
import { PostEdit } from "../../../../views";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await prefetchOne("posts", id);
  return (
    <Prefetched state={state}>
      <PostEdit id={id} />
    </Prefetched>
  );
}
