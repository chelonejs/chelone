<script setup lang="ts">
/**
 * A panel that plays "another user". Each button acts through the same wrapped
 * provider and lock provider as the app, so the events reach the open views
 * the way a second browser's would.
 */

import type { Identifier } from "@chelone/core";
import {
  Button,
  SidebarContextKey,
  SidebarMenuButton,
  SidebarMenuItem,
  useGetLockLive,
  useNotify,
} from "@chelone/vue";
import { Lock, Plus } from "lucide-vue-next";
import { computed, inject } from "vue";
import { dataProvider, locks } from "./realtime";

// `postId` is the post the lock button takes, the first seeded post by default.
// `sidebar` renders the buttons as sidebar entries, for a `<SidebarMenu>`: a
// collapsed sidebar shows them as icon buttons, with the text as the tooltip
// and the accessible name.
const props = withDefaults(
  defineProps<{ postId?: Identifier; sidebar?: boolean }>(),
  { postId: 1, sidebar: false },
);

const sidebarContext = inject(SidebarContextKey, null);
// The mobile drawer shows the full sidebar whatever the desktop rail does.
const collapsed = computed(
  () =>
    props.sidebar &&
    sidebarContext !== null &&
    !sidebarContext.open.value &&
    !sidebarContext.isMobile.value,
);

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

const addPostLabel = "Another user adds a post";
const lockLabel = computed(
  () =>
    `Another user ${heldByAlice.value ? "unlocks" : "locks"} post ${String(props.postId)}`,
);
const entries = computed(() => [
  { icon: Plus, label: addPostLabel, run: addPost },
  { icon: Lock, label: lockLabel.value, run: toggleLock },
]);
</script>

<template>
  <template v-if="sidebar">
    <SidebarMenuItem v-for="(entry, index) in entries" :key="index">
      <SidebarMenuButton
        type="button"
        :title="collapsed ? entry.label : undefined"
        :aria-label="collapsed ? entry.label : undefined"
        @click="entry.run"
      >
        <component :is="entry.icon" />
        <span v-if="!collapsed">{{ entry.label }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </template>
  <div v-else class="flex flex-wrap items-center gap-2">
    <Button type="button" variant="outline" size="sm" @click="addPost">
      {{ addPostLabel }}
    </Button>
    <Button type="button" variant="outline" size="sm" @click="toggleLock">
      {{ lockLabel }}
    </Button>
  </div>
</template>
