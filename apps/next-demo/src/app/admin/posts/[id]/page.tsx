import { HydrationBoundary } from "@tanstack/react-query";
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
    <HydrationBoundary state={state}>
      <PostEdit id={id} />
    </HydrationBoundary>
  );
}
