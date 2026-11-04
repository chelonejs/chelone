<script setup lang="ts">
/**
 * Type fixture for `createResourceComponents`: checked by `vue-tsc`, never
 * mounted. Each `@vue-expect-error` line must stay an error, or the typecheck
 * fails on the unused directive.
 */
import { defineResources } from "@chelone/core";
import { z } from "zod";
import { createResourceComponentsOf } from "../create-resource-components";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      items: z.array(z.object({ sku: z.string(), qty: z.number() })),
    }),
  },
  users: { schema: z.object({ id: z.string(), name: z.string() }) },
});

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");
</script>

<template>
  <!-- a posts path and a bracket path pass -->
  <posts.TextInput source="title" />
  <posts.TextInput source="items[0].sku" />
  <posts.TextField source="title" />
  <posts.Edit :id="1">
    <posts.NumberInput source="id" />
  </posts.Edit>
  <posts.List />

  <!-- a typo -->
  <!-- @vue-expect-error -->
  <posts.TextInput source="titel" />

  <!-- a path that only another resource has -->
  <!-- @vue-expect-error -->
  <posts.TextInput source="name" />
  <!-- @vue-expect-error -->
  <posts.TextField source="name" />

  <!-- a posts view has no resource prop -->
  <!-- @vue-expect-error -->
  <posts.Edit resource="users" :id="1" />
  <!-- @vue-expect-error -->
  <posts.List resource="users" />

  <!-- a generic SFC is not a member -->
  <!-- @vue-expect-error -->
  <posts.SelectInput source="title" />
</template>
