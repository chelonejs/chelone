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
      views: z.number(),
      publishedAt: z.date().nullable(),
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

  <!-- an array input takes the rows of the array it binds -->
  <posts.ArrayInput source="items" :default-value="[{ sku: 'a', qty: 1 }]" :item-defaults="{ qty: 1 }">
    <posts.TextInput source="sku" />
  </posts.ArrayInput>
  <!-- @vue-expect-error -->
  <posts.ArrayInput source="itemz" />
  <!-- @vue-expect-error -->
  <posts.ArrayInput source="items" :default-value="[{ sku: 'a', qty: 'one' }]" />

  <!-- a default is the value at the source -->
  <posts.TextInput source="title" default-value="Untitled" />
  <!-- @vue-expect-error -->
  <posts.TextInput source="title" :default-value="1" />

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

  <!-- format receives the value type at its source -->
  <posts.DateTimeInput source="title" :format="(value: string) => value" />
  <posts.DateTimeInput source="views" :format="(value: number) => String(value)" />
  <!-- @vue-expect-error -->
  <posts.DateTimeInput source="views" :format="(value: string) => value" />

  <!-- parse must return the value type at its source -->
  <posts.DateTimeInput source="views" :parse="(value: unknown) => Number(value)" />
  <!-- @vue-expect-error -->
  <posts.DateTimeInput source="views" :parse="(value: unknown) => String(value)" />

  <!-- transform receives the value type at its source -->
  <posts.DateField
    source="publishedAt"
    :transform="(value: Date | null) => value ?? undefined"
  />
  <!-- @vue-expect-error -->
  <posts.DateField source="publishedAt" :transform="(value: string) => new Date(value)" />
  <posts.NumberField source="views" :transform="(value: number) => value" />

  <!-- a member with a slot keeps it -->
  <posts.FileInput source="title" :format="(value: string) => null">
    <template #default="{ record }">{{ record }}</template>
  </posts.FileInput>

  <!-- a typo is still rejected on a member with a value callback -->
  <!-- @vue-expect-error -->
  <posts.DateTimeInput source="titel" />

  <!-- a member with no format, parse or transform keeps its props -->
  <posts.TextField source="title" class="x" />

  <!-- a generic SFC is not a member -->
  <!-- @vue-expect-error -->
  <posts.SelectInput source="title" />
</template>
