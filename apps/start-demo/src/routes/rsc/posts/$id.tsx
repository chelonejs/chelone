/**
 * `/rsc/posts/:id`: a read-only post page that ships as server-rendered HTML.
 * The loader calls a server function that reads the post and returns the
 * rendered page, so the browser gets markup and no field code.
 */

import {
  ServerNumberField,
  ServerRecordField,
  ServerShow,
  ServerTextField,
} from "@chelone/react/rsc";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { z } from "zod";
import { findPost } from "../../../server-data";

const getPostPage = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data: rawId }) => {
    const post = await findPost(rawId);
    if (post === undefined) throw notFound();
    return renderServerComponent(
      <ServerShow
        record={post}
        actions={<a href={`/admin/posts/${post.id}`}>Edit</a>}
      >
        <ServerRecordField label="post.title">
          <ServerTextField record={post} source="title" />
        </ServerRecordField>
        <ServerRecordField label="post.views" variant="inline">
          <ServerNumberField record={post} source="views" locales="en-US" />
        </ServerRecordField>
        <ServerRecordField label="post.status" variant="inline">
          <ServerTextField record={post} source="status" />
        </ServerRecordField>
      </ServerShow>,
    );
  });

export const Route = createFileRoute("/rsc/posts/$id")({
  loader: ({ params }) => getPostPage({ data: params.id }),
  component: PostPage,
});

function PostPage() {
  return (
    <main>
      <h1>Server post</h1>
      {Route.useLoaderData()}
    </main>
  );
}
