/**
 * `/admin/posts/:id` — the loader prefetches the record under the same `oneKey`
 * `<Edit>` reads it from, so the form renders with the record already in cache.
 */

import { getOneOptions } from "@chelone/core";
import { Edit, SaveButton, TextInput, Toolbar } from "@chelone/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/posts/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      getOneOptions(context, "posts", { id: params.id }),
    ),
  component: PostEditPage,
});

function PostEditPage() {
  const { id } = Route.useParams();
  return (
    <Edit resource="posts" id={id}>
      <TextInput source="title" />
      <TextInput source="body" multiline rows={6} />
      <Toolbar>
        <SaveButton />
      </Toolbar>
    </Edit>
  );
}
