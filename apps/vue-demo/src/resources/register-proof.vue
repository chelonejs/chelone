<script setup lang="ts">
/**
 * Type-checked by `vue-tsc`, never imported by the app. `./schema.ts`
 * registers the demo's resources by augmenting `Register`, so
 * this file proves the app-side path: a `posts` source passes and a typo fails
 * at the call site. Each `@vue-expect-error` must stay an error, or the
 * typecheck fails on the unused directive.
 */
import { createResourceComponents, Resource } from "@chelone/vue";
import "./schema";

const posts = createResourceComponents("posts");

// @ts-expect-error `comments` is no registered resource
createResourceComponents("comments");
</script>

<template>
  <!-- a posts path and a bracket path pass -->
  <posts.TextInput source="title" />
  <posts.TextInput source="tags[0].label" />

  <!-- a typo -->
  <!-- @vue-expect-error -->
  <posts.TextInput source="titel" />

  <!-- a path that only authors has -->
  <!-- @vue-expect-error -->
  <posts.TextInput source="name" />

  <!-- a registered resource name passes, an unregistered one fails -->
  <Resource name="posts" />
  <!-- @vue-expect-error `comments` is no registered resource -->
  <Resource name="comments" />
</template>
