<script lang="ts">
export const mode = "realtime";
</script>

<script setup lang="ts">
import { Button, MenuLive, useCreate } from "@chelone/vue";

// Writes a post the way a second user's browser would, over the same provider.
const { mutate } = useCreate("posts");
const addPost = () =>
  mutate({
    data: {
      title: `Post added at ${new Date().toLocaleTimeString()}`,
      body: "Added by another user.",
      author_id: 1,
      views: 0,
      published: false,
    },
  });

const items = [
  { to: "/docs/realtime/list-live", resource: "posts", label: "Unread posts" },
];
</script>

<template>
  <!-- `<MenuLive>` counts the posts created since the user last opened the link. The count clears while the link's route is open: this link goes to the `<ListLive>` page, so opening it resets the badge. -->
  <div class="flex w-56 flex-col gap-4">
    <MenuLive :items="items" />
    <Button variant="outline" size="sm" @click="addPost">
      Another user adds a post
    </Button>
  </div>
</template>
