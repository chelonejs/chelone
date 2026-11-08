/**
 * Type-checked, never imported by the app. `./index.ts` registers the demo's
 * resources by augmenting `Register`, so this file proves the
 * app-side path: a `posts` source passes and a typo fails at the call site.
 * Each `@ts-expect-error` must stay an error, or `tsc` fails on the unused
 * directive.
 */
import { createResourceComponents, Resource } from "@chelone/react";
import "./index";

const posts = createResourceComponents("posts");

export function RegisterProof() {
  return (
    <>
      {/* a posts path and a bracket path pass */}
      <posts.TextInput source="title" />
      <posts.TextInput source="tags[0].label" />

      {/* a typo */}
      {/* @ts-expect-error `titel` is no path of a post */}
      <posts.TextInput source="titel" />

      {/* a path that only authors has */}
      {/* @ts-expect-error `name` belongs to authors, not posts */}
      <posts.TextInput source="name" />
    </>
  );
}

// @ts-expect-error `comments` is no registered resource
createResourceComponents("comments");

export function ResourceNameProof() {
  return (
    <>
      <Resource name="posts" />
      {/* @ts-expect-error `comments` is no registered resource */}
      <Resource name="comments" />
    </>
  );
}
