<script lang="ts">
export const mode = "realtime";
</script>

<script setup lang="ts">
import { Button, MenuLive, useCreate, useNavigate } from "@chelone/vue";

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

// The preview's router has no pages, so the link opens a path inside it and the
// button leaves again. The React demo's link goes to the real `<ListLive>` page.
const navigate = useNavigate();
const items = [{ to: "/posts", resource: "posts", label: "Unread posts" }];
</script>

<template>
  <!-- `<MenuLive>` counts the posts created since the user last opened the link. The count clears while the link's route is open: click "Unread posts" to open it and the badge resets, then "Leave the page" to count again. -->
  <div class="flex w-56 flex-col gap-4">
    <MenuLive :items="items" />
    <Button variant="outline" size="sm" @click="addPost">
      Another user adds a post
    </Button>
    <Button variant="ghost" size="sm" @click="navigate('/')">
      Leave the page
    </Button>
  </div>
</template>
