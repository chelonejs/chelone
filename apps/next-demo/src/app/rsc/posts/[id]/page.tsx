/**
 * `/rsc/posts/[id]`: a read-only post page that ships as server-rendered HTML.
 * The page reads the post itself and hands it to `<ServerShow>`, which fetches
 * nothing and calls no hook, so the browser gets markup and no field code. An
 * id that names no row answers with `notFound()`, which Next renders as its
 * not-found page.
 */

import {
  ServerNumberField,
  ServerRecordField,
  ServerShow,
  ServerTextField,
} from "@chelone/react/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findPost } from "../../../../server-data";

export default async function PostShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await findPost(id);
  if (post === undefined) notFound();

  return (
    <main>
      <h1>Server post</h1>
      <ServerShow
        record={post}
        actions={<Link href={`/admin/posts/${post.id}`}>Edit</Link>}
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
      </ServerShow>
    </main>
  );
}
