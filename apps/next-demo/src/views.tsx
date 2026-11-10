"use client";

/**
 * The page views, in a client file because `@chelone/react` renders with hooks
 * and context, which a server component cannot. Each page prefetches on the
 * server and hands the dehydrated state to a `<HydrationBoundary>` around one
 * of these.
 */

import {
  DataTable,
  Edit,
  List,
  SaveButton,
  TextInput,
  Toolbar,
} from "@chelone/react";

export function PostList() {
  return (
    <List resource="posts">
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </DataTable>
    </List>
  );
}

export function PostEdit({ id }: { id: string }) {
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

export function CommentList() {
  return (
    <List resource="comments">
      <DataTable>
        <DataTable.Col source="authorName" />
        <DataTable.Col source="body" />
      </DataTable>
    </List>
  );
}
