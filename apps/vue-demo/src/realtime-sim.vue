<script setup lang="ts">
/**
 * A panel that plays "another user". Each button acts through the same wrapped
 * provider and lock provider as the app, so the events reach the open views
 * the way a second browser's would.
 */

import type { Identifier } from "@chelone/core";
import { Button, useGetLockLive, useNotify } from "@chelone/vue";
import { computed } from "vue";
import { dataProvider, locks } from "./realtime";

// The post the lock button takes. Defaults to the first seeded post.
const props = withDefaults(defineProps<{ postId?: Identifier }>(), {
  postId: 1,
});

const notify = useNotify();
const { data: lock } = useGetLockLive("posts", () => ({ id: props.postId }));
const heldByAlice = computed(() => lock.value?.identity === "alice");

function addPost() {
  return dataProvider.create("posts", {
    data: {
      title: `Post added at ${new Date().toLocaleTimeString()}`,
      body: "Added by another user.",
      author_id: 1,
      views: 0,
      published: false,
    },
  });
}

// The same button releases alice's lock, so the demo can always free a post.
function toggleLock() {
  return (heldByAlice.value ? locks.unlock : locks.lock)("posts", {
    id: props.postId,
    identity: "alice",
  }).catch((error: Error) => notify(error.message, { type: "error" }));
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Button type="button" variant="outline" size="sm" @click="addPost">
      Another user adds a post
    </Button>
    <Button type="button" variant="outline" size="sm" @click="toggleLock">
      Another user {{ heldByAlice ? "unlocks" : "locks" }} post {{ String(postId) }}
    </Button>
  </div>
</template>
